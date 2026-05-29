const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/generate', async (req, res) => {
  const { campaignType, startDate, endDate, details } = req.body;
  if (!details) return res.status(400).json({ error: '缺少活動/商品資訊' });

  const isEvent = campaignType === 'event';

  const systemPrompt = `你是台灣頂尖廣告文案師，專精 Facebook/Instagram 社群廣告。
規則：
- 繁體中文，口語親切
- 主標題不超過 20 字，正文不超過 125 字
- 一定要有 CTA（立即報名、限時優惠、馬上購買 等）
- hashtag 3-5 個，貼近台灣用語
- 輸出格式嚴格遵守，不加額外說明`;

  const prompt = isEvent
    ? `請為以下活動產生 3 個廣告文案版本：

【活動資訊】
${details}
【宣傳期間】${startDate} 至 ${endDate}

輸出格式（每個版本）：
===VERSION_1_START===
風格：活潑情感版
主標題：...
正文：...
Hashtag：...
===VERSION_1_END===
===VERSION_2_START===
風格：資訊條列版
主標題：...
正文：...
Hashtag：...
===VERSION_2_END===
===VERSION_3_START===
風格：限時促銷版
主標題：...
正文：...
Hashtag：...
===VERSION_3_END===`
    : `請為以下商品/服務產生 3 個廣告文案版本：

【商品資訊】
${details}
【宣傳期間】${startDate} 至 ${endDate}

輸出格式（每個版本）：
===VERSION_1_START===
風格：情感情境版
主標題：...
正文：...
Hashtag：...
===VERSION_1_END===
===VERSION_2_START===
風格：功效利益版
主標題：...
正文：...
Hashtag：...
===VERSION_2_END===
===VERSION_3_START===
風格：社群口碑版
主標題：...
正文：...
Hashtag：...
===VERSION_3_END===`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;
    const variations = parseVariations(raw);
    res.json({ success: true, variations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function parseVariations(text) {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const match = text.match(
      new RegExp(`===VERSION_${i}_START===([\\s\\S]*?)===VERSION_${i}_END===`)
    );
    if (!match) continue;
    const block = match[1].trim();
    const get = (key) => {
      const m = block.match(new RegExp(`${key}：([^\\n]+)`));
      return m ? m[1].trim() : '';
    };
    results.push({
      id: i,
      style: get('風格'),
      title: get('主標題'),
      body: get('正文'),
      hashtags: get('Hashtag'),
    });
  }
  if (results.length === 0) {
    results.push({ id: 1, style: '版本一', title: '', body: text, hashtags: '' });
  }
  return results;
}

module.exports = router;
