const express = require('express');
const { chromium } = require('playwright');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { getAuthorizedClient } = require('./auth');

const router = express.Router();
const STORAGE_DIR = path.join(__dirname, '../../.storage');
const PUB_PROFILE = path.join(STORAGE_DIR, 'publish-profile');
fs.mkdirSync(PUB_PROFILE, { recursive: true });

let pubCtx = null;

async function getCtx() {
  if (pubCtx) {
    try {
      // Verify context is still alive by attempting a real operation
      await pubCtx.pages();
      return pubCtx;
    } catch {
      pubCtx = null;
    }
  }
  pubCtx = await chromium.launchPersistentContext(PUB_PROFILE, {
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
  await pubCtx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  return pubCtx;
}

async function waitForLogin(page, doneCheck) {
  await page.waitForTimeout(1500);
  const needsLogin = await page.evaluate(doneCheck).catch(() => true);
  if (!needsLogin) return;
  console.log('[PromoGen] Waiting for login in Chrome window (3 min)...');
  await page.waitForFunction(doneCheck, { timeout: 180000 });
  await page.waitForTimeout(2000);
  console.log('[PromoGen] Login confirmed.');
}

async function getPage() {
  try {
    const ctx = await getCtx();
    return await ctx.newPage();
  } catch {
    pubCtx = null;
    const ctx = await getCtx();
    return await ctx.newPage();
  }
}

process.on('SIGTERM', async () => { if (pubCtx) { try { await pubCtx.close(); } catch {} } });
process.on('SIGINT',  async () => { if (pubCtx) { try { await pubCtx.close(); } catch {} } });

function localImagePath(imageUrl) {
  return path.join(STORAGE_DIR, path.basename(imageUrl));
}

// ── Blogger API v3 (free, no browser needed) ─────────────────────────────
router.post('/blogger', async (req, res) => {
  const { title, copy, startDate, endDate } = req.body;

  try {
    const auth = await getAuthorizedClient();
    const blogger = google.blogger({ version: 'v3', auth });

    // Get first blog
    const blogsResp = await blogger.blogs.listByUser({ userId: 'self' });
    const blog = blogsResp.data.items?.[0];
    if (!blog) return res.status(400).json({ success: false, error: '找不到 Blogger 網誌，請先在 Blogger 建立一個網誌。' });

    const content = `<p style="font-size:16px;line-height:1.8;white-space:pre-wrap;">${copy.replace(/\n/g, '<br>')}</p>`
      + (startDate && endDate ? `<p style="color:#888;font-size:13px;margin-top:16px;">宣傳期間：${startDate} 至 ${endDate}</p>` : '');

    const post = await blogger.posts.insert({
      blogId: blog.id,
      isDraft: false,
      requestBody: { title, content, status: 'LIVE' },
    });

    res.json({ success: true, postUrl: post.data.url, platform: 'Blogger' });
  } catch (err) {
    if (err.message === 'BLOGGER_NOT_CONFIGURED') {
      return res.status(401).json({ success: false, error: '請先設定 Google OAuth 憑證', setupRequired: true });
    }
    if (err.message === 'BLOGGER_NOT_AUTHORIZED') {
      return res.status(401).json({ success: false, error: '請先連結 Google 帳號', authRequired: true });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Discord Webhook (free, no auth needed) ────────────────────────────────
router.post('/discord', async (req, res) => {
  const { webhookUrl, title, copy, imageUrl, startDate, endDate } = req.body;
  if (!webhookUrl) return res.status(400).json({ success: false, error: '缺少 Webhook URL' });

  const imgPath = imageUrl ? localImagePath(imageUrl) : null;
  const hasImage = imgPath && fs.existsSync(imgPath);

  const embed = {
    title: title || '廣告文案',
    description: copy,
    color: 0xf97316,
    ...(startDate && endDate ? { footer: { text: `宣傳期間：${startDate} – ${endDate}` } } : {}),
  };

  try {
    let response;
    if (hasImage) {
      // Upload image as attachment and reference in embed
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(imgPath), { filename: 'promo.png' });
      embed.image = { url: 'attachment://promo.png' };
      form.append('payload_json', JSON.stringify({ embeds: [embed] }));

      response = await fetch(webhookUrl, { method: 'POST', body: form, headers: form.getHeaders() });
    } else {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ success: false, error: `Discord 錯誤：${response.status} ${text}` });
    }
    res.json({ success: true, postUrl: '', platform: 'Discord' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Facebook personal post (free) ─────────────────────────────────────────
router.post('/facebook', async (req, res) => {
  const { copy, imageUrl } = req.body;
  const imgPath = localImagePath(imageUrl);

  const page = await getPage();

  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await waitForLogin(page, () =>
      !window.location.href.includes('/login') && !window.location.href.includes('checkpoint')
    );

    // Open post composer
    const composeSel = '[aria-label*="your mind"], [placeholder*="your mind"], div[role="button"]:has-text("What")';
    await page.waitForSelector(composeSel, { timeout: 15000 });
    await page.click(composeSel);
    await page.waitForTimeout(1000);

    // Type copy text
    const textAreaSel = '[contenteditable="true"][aria-multiline="true"], [contenteditable="true"][data-lexical-editor]';
    const textArea = page.locator(textAreaSel).first();
    await textArea.waitFor({ timeout: 10000 });
    await textArea.click();
    await textArea.type(copy, { delay: 5 });

    // Add photo
    if (fs.existsSync(imgPath)) {
      try {
        const photoSel = '[aria-label*="Photo"], [aria-label*="photo"], [data-testid*="photo"]';
        await page.click(photoSel, { timeout: 5000 });
        await page.waitForTimeout(600);

        const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 })]);
        await fc.setFiles(imgPath);
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('FB photo upload skipped:', e.message);
      }
    }

    // Submit post
    const postBtnSel = '[aria-label="Post"], [data-testid="react-composer-post-button"], button:has-text("Post"):not([aria-label*="Comment"])';
    await page.waitForSelector(postBtnSel, { timeout: 10000 });
    await page.click(postBtnSel);
    await page.waitForTimeout(3000);

    res.json({ success: true, postUrl: 'https://www.facebook.com/', platform: 'Facebook' });
  } catch (err) {
    sendError(res, err, '請在開啟的 Chrome 視窗中登入 Facebook');
  } finally {
    await page.close();
  }
});

function sendError(res, err, loginMsg) {
  const isLogin = err.message === 'LOGIN_REQUIRED';
  res.status(isLogin ? 401 : 500).json({
    success: false,
    error: isLogin ? loginMsg : err.message,
    loginRequired: isLogin,
  });
}

module.exports = router;
