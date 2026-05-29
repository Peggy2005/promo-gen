const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const STORAGE_DIR = path.join(__dirname, '../../.storage');
const GPT_PROFILE = path.join(STORAGE_DIR, 'gpt-profile');
fs.mkdirSync(GPT_PROFILE, { recursive: true });

let gptCtx = null;

async function getCtx() {
  if (gptCtx) {
    try { gptCtx.pages(); return gptCtx; } catch { gptCtx = null; }
  }
  gptCtx = await chromium.launchPersistentContext(GPT_PROFILE, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });
  // Remove webdriver fingerprint from all pages
  await gptCtx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete window.navigator.__proto__.webdriver;
  });
  return gptCtx;
}

// ── Generate copy (3 variations) ──────────────────────────────────────────
router.post('/copy', async (req, res) => {
  const { campaignType, startDate, endDate, details } = req.body;
  if (!details) return res.status(400).json({ error: '缺少資訊' });

  const isEvent = campaignType === 'event';
  const prompt = `你是台灣頂尖廣告文案師，專精 Facebook/Instagram。請為以下${isEvent ? '活動' : '商品'}生成 3 個廣告文案：

${isEvent ? '【活動資訊】' : '【商品資訊】'}
${details}
宣傳期間：${startDate} 至 ${endDate}

嚴格使用此格式輸出，不加任何額外說明：
===VERSION_1_START===
風格：活潑情感版
主標題：（20字內）
正文：（125字內，含CTA）
Hashtag：#tag1 #tag2 #tag3
===VERSION_1_END===
===VERSION_2_START===
風格：資訊條列版
主標題：（20字內）
正文：（125字內，含CTA）
Hashtag：#tag1 #tag2 #tag3
===VERSION_2_END===
===VERSION_3_START===
風格：限時促銷版
主標題：（20字內）
正文：（125字內，含CTA）
Hashtag：#tag1 #tag2 #tag3
===VERSION_3_END===`;

  try {
    const text = await askGPT(prompt, { expectText: true });
    res.json({ success: true, variations: parseVariations(text), raw: text });
  } catch (err) {
    sendError(res, err);
  }
});

// ── Generate image via Pollinations.ai (free, no API key) ─────────────────
router.post('/image', async (req, res) => {
  const { title, keywords, style, startDate, endDate } = req.body;
  if (!keywords) return res.status(400).json({ error: '缺少關鍵字' });

  const styleMap = {
    vibrant: 'vibrant energetic colorful dynamic',
    elegant: 'minimalist elegant luxury clean',
    lifestyle: 'lifestyle photography natural warm realistic',
  };

  const prompt = `${styleMap[style] || styleMap.vibrant} commercial advertisement, theme: ${keywords}, NO text NO words NO letters NO typography, square 1:1, professional high quality`;

  const overlayLines = [];
  if (title) overlayLines.push(title);
  if (startDate && endDate) overlayLines.push(`${startDate} – ${endDate}`);

  try {
    const { filename } = await generateImageWithOverlay(prompt, overlayLines);
    res.json({ success: true, imageUrl: `/api/images/${filename}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Browser login status ──────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const ctx = await getCtx();
    const page = await ctx.newPage();
    await page.goto('https://chatgpt.com/', { timeout: 15000 });
    const url = page.url();
    await page.close();
    const loggedIn = !url.includes('/auth/') && !url.includes('accounts.google');
    res.json({ ready: true, loggedIn });
  } catch (e) {
    res.json({ ready: false, loggedIn: false, error: e.message });
  }
});

// Wait for ChatGPT login if needed (up to 3 minutes)
async function waitForLogin(page) {
  await page.waitForTimeout(2000); // let redirects settle

  const loggedIn = await page.evaluate(() => {
    const url = window.location.href;
    if (url.includes('/auth/') || url.includes('accounts.google') || url.includes('/login')) return false;
    const btns = [...document.querySelectorAll('button, a')];
    return !btns.some(el => /^Log in$/i.test(el.textContent.trim()));
  }).catch(() => false);

  if (loggedIn) return;

  console.log('[PromoGen] Not logged in — please log in in the Chrome window (3 min)...');

  await page.waitForFunction(() => {
    const url = window.location.href;
    if (url.includes('/auth/') || url.includes('accounts.google') || url.includes('/login')) return false;
    const btns = [...document.querySelectorAll('button, a')];
    return !btns.some(el => /^Log in$/i.test(el.textContent.trim()));
  }, { timeout: 180000 });

  await page.waitForTimeout(2000); // let post-login redirects settle
  console.log('[PromoGen] Login confirmed, continuing...');
}

// Flush cookies on process exit
process.on('SIGTERM', async () => { if (gptCtx) { try { await gptCtx.close(); } catch {} } process.exit(0); });
process.on('SIGINT',  async () => { if (gptCtx) { try { await gptCtx.close(); } catch {} } process.exit(0); });

// ─────────────────────────────────────────────────────────────────────────
async function getPage() {
  try {
    const ctx = await getCtx();
    return await ctx.newPage();
  } catch {
    gptCtx = null;
    const ctx = await getCtx();
    return await ctx.newPage();
  }
}

async function askGPT(prompt) {
  const page = await getPage();

  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await waitForLogin(page);

    // Find and focus the input (allow up to 90s for Cloudflare redirect after CAPTCHA)
    const inputSel = '#prompt-textarea';
    await page.waitForSelector(inputSel, { timeout: 90000 });
    await page.click(inputSel);

    // Type prompt (chunk to avoid timeouts on long prompts)
    await page.evaluate((txt) => {
      const el = document.querySelector('#prompt-textarea');
      if (el) el.textContent = txt;
    }, prompt);
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');

    // Wait for generation
    await waitForResponse(page);
    await waitForDone(page);

    // Extract last assistant message
    const msgs = page.locator('[data-message-author-role="assistant"]');
    const n = await msgs.count();
    return await msgs.nth(n - 1).innerText();
  } finally {
    await page.close();
  }
}

async function generateImageWithOverlay(prompt, overlayLines = []) {
  const sharp = require('sharp');
  const https = require('https');

  const safePrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

  console.log('[PromoGen] Fetching image from Pollinations...');
  const imgBuffer = await downloadUrl(url);

  const filename = `img-${Date.now()}.png`;
  const localPath = path.join(STORAGE_DIR, filename);

  if (overlayLines.length > 0) {
    const result = await addTextOverlay(imgBuffer, overlayLines, sharp);
    fs.writeFileSync(localPath, result);
  } else {
    fs.writeFileSync(localPath, imgBuffer);
  }

  return { filename, localPath };
}

function downloadUrl(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        resolve(downloadUrl(res.headers.location, redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function addTextOverlay(imgBuffer, lines, sharp) {
  const meta = await sharp(imgBuffer).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  const lineH = 52;
  const pad = 24;
  const boxH = lines.length * lineH + pad * 2;
  const boxY = h - boxH - 20;

  const textEls = lines.map((line, i) => {
    const size = i === 0 ? 42 : 30;
    const weight = i === 0 ? 'bold' : 'normal';
    const y = boxY + pad + i * lineH + lineH * 0.75;
    return `<text x="${w / 2}" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="white" filter="url(#sh)">${escXml(line)}</text>`;
  }).join('');

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="sh"><feDropShadow dx="1" dy="1" stdDeviation="3" flood-color="#000" flood-opacity="0.85"/></filter></defs>
  <rect x="0" y="${boxY}" width="${w}" height="${boxH + 20}" fill="rgba(0,0,0,0.58)" rx="8"/>
  ${textEls}
</svg>`;

  return sharp(imgBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function waitForResponse(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('[data-message-author-role="assistant"]').length > 0,
    { timeout: 30000 }
  );
}

async function waitForDone(page) {
  try {
    const stopSel = 'button[aria-label="Stop streaming"], button[data-testid="stop-button"]';
    await page.waitForSelector(stopSel, { timeout: 8000 });
    await page.waitForFunction(
      (sel) => !document.querySelector(sel),
      stopSel,
      { timeout: 180000 }
    );
  } catch {
    await page.waitForTimeout(2000);
  }
}

function parseVariations(text) {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const m = text.match(new RegExp(`===VERSION_${i}_START===([\\s\\S]*?)===VERSION_${i}_END===`));
    if (!m) continue;
    const block = m[1].trim();
    const get = (key) => { const r = block.match(new RegExp(`${key}：([^\\n]+)`)); return r ? r[1].trim() : ''; };
    results.push({ id: i, style: get('風格'), title: get('主標題'), body: get('正文'), hashtags: get('Hashtag') });
  }
  if (!results.length) results.push({ id: 1, style: '版本一', title: '', body: text, hashtags: '' });
  return results;
}

function sendError(res, err) {
  const isLogin = err.message === 'LOGIN_REQUIRED';
  res.status(isLogin ? 401 : 500).json({
    success: false,
    error: isLogin ? '請在開啟的 Chrome 視窗中登入 ChatGPT，然後重試' : err.message,
    loginRequired: isLogin,
  });
}

module.exports = router;
