const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const STORAGE_DIR = path.join(__dirname, '../../.storage');
const TOKEN_PATH = path.join(STORAGE_DIR, 'google-token.json');
const CONFIG_PATH = path.join(STORAGE_DIR, 'google-config.json');

const SCOPES = ['https://www.googleapis.com/auth/blogger'];
const REDIRECT_URI = 'http://localhost:3001/api/auth/callback';

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getOAuthClient() {
  const cfg = loadConfig();
  if (!cfg) throw new Error('NO_CONFIG');
  return new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, REDIRECT_URI);
}

// GET /api/auth/status
router.get('/status', (req, res) => {
  const hasConfig = !!loadConfig();
  const hasToken = fs.existsSync(TOKEN_PATH);
  res.json({ configured: hasConfig, authorized: hasToken });
});

// POST /api/auth/config — save client id/secret
router.post('/config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (!clientId || !clientSecret) return res.status(400).json({ error: '缺少 Client ID 或 Secret' });
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ clientId, clientSecret }));
  res.json({ ok: true });
});

// GET /api/auth/blogger — start OAuth
router.get('/blogger', (req, res) => {
  try {
    const auth = getOAuthClient();
    const url = auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
    res.redirect(url);
  } catch {
    res.status(400).send('尚未設定 Google Client ID/Secret，請先在 PromoGen 設定頁填入。');
  }
});

// GET /api/auth/callback — handle OAuth response
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Google 授權失敗：${error}`);
  try {
    const auth = getOAuthClient();
    const { tokens } = await auth.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>✅ Blogger 已連結成功！</h2><p>關閉此視窗，回到 PromoGen 繼續操作。</p></body></html>');
  } catch (e) {
    res.status(500).send(`授權失敗：${e.message}`);
  }
});

module.exports = router;
module.exports.getAuthorizedClient = async function () {
  const cfg = loadConfig();
  if (!cfg) throw new Error('BLOGGER_NOT_CONFIGURED');
  if (!fs.existsSync(TOKEN_PATH)) throw new Error('BLOGGER_NOT_AUTHORIZED');
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const auth = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, REDIRECT_URI);
  auth.setCredentials(tokens);
  auth.on('tokens', (newTokens) => {
    const updated = { ...tokens, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated));
  });
  return auth;
};
