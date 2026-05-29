const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Search reference images via Firecrawl
router.post('/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: '缺少搜尋關鍵字' });

  try {
    const response = await axios.post(
      'https://api.firecrawl.dev/v1/search',
      { query, limit: 8, scrapeOptions: { formats: ['links'] } },
      {
        headers: {
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const results = response.data?.data || [];
    const images = results
      .flatMap((r) => {
        const candidates = [
          r.metadata?.ogImage,
          r.metadata?.image,
          ...(r.links || []).filter((l) =>
            /\.(jpg|jpeg|png|webp)/i.test(l)
          ),
        ];
        return candidates
          .filter(Boolean)
          .map((url) => ({ url, title: r.metadata?.title || r.url, source: r.url }));
      })
      .slice(0, 8);

    res.json({ success: true, images });
  } catch (err) {
    // Return empty on search failure — not critical
    res.json({ success: true, images: [], warning: err.message });
  }
});

// Generate promotional image via DALL-E 3
router.post('/generate', async (req, res) => {
  const { title, body, keywords, style = 'vibrant' } = req.body;
  if (!keywords) return res.status(400).json({ error: '缺少圖片關鍵字' });

  const prompt = buildPrompt(title, body, keywords, style);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });
    res.json({ success: true, imageUrl: response.data[0].url, prompt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function buildPrompt(title, body, keywords, style) {
  const styleDesc =
    style === 'vibrant'
      ? 'vibrant, energetic, warm tones, bright'
      : style === 'elegant'
      ? 'elegant, minimalist, clean white space, premium'
      : 'natural, authentic, lifestyle photography';

  return `Professional Taiwanese social media advertising image, no text in image.
Theme: ${keywords}
${title ? `Campaign: "${title}"` : ''}
Visual style: ${styleDesc}, eye-catching, modern design
Suitable for Facebook and Instagram square format (1:1)
High quality, professional photography or illustration
The image should make viewers want to engage immediately.
Color palette should be harmonious and attention-grabbing.
Include relevant visual elements related to: ${keywords}`;
}

module.exports = router;
