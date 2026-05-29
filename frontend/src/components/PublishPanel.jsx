import { useState } from 'react';
import { publishToDiscord, publishToBlogger, publishToFacebook } from '../api/client';

const PLATFORMS = [
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    color: 'bg-indigo-600',
    desc: 'Webhook 直接發布，不需登入',
    note: '貼上 Webhook URL 即可',
    needsWebhook: true,
  },
  {
    id: 'blogger',
    name: 'Blogger',
    icon: 'B',
    color: 'bg-orange-600',
    desc: 'Google 免費部落格，需先連結 Google 帳號',
    note: '',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    color: 'bg-blue-600',
    desc: '發布到個人動態（需登入）',
    note: '',
  },
];

export default function PublishPanel({ imageUrl, copy, title, startDate, endDate, onBack }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('discordWebhook') || '');
  const [selected, setSelected] = useState('discord');

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    try {
      let data;
      if (selected === 'discord') {
        if (!webhookUrl.trim()) { setError('請輸入 Discord Webhook URL'); setLoading(false); return; }
        localStorage.setItem('discordWebhook', webhookUrl.trim());
        ({ data } = await publishToDiscord({ webhookUrl: webhookUrl.trim(), title, copy, imageUrl, startDate, endDate }));
      } else if (selected === 'blogger') {
        ({ data } = await publishToBlogger({ title, copy, imageUrl, startDate, endDate }));
      } else {
        ({ data } = await publishToFacebook({ copy, imageUrl }));
      }
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  if (result?.success) {
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl mt-2">🎉</div>
        <h3 className="text-xl font-bold text-white">發布成功！</h3>
        <p className="text-gray-400 text-sm">已發布到 {result.platform}</p>

        {result.postUrl && (
          <div className="card text-left">
            <p className="text-xs text-gray-500 mb-1">貼文連結</p>
            <a href={result.postUrl} target="_blank" rel="noreferrer"
              className="text-brand-light text-sm break-all hover:underline">{result.postUrl}</a>
          </div>
        )}

        <div className="card">
          <p className="text-xs text-gray-500 mb-3">貼文預覽</p>
          <div className="flex gap-3">
            <img src={imageUrl} alt="ad" className="w-20 h-20 object-cover rounded-lg shrink-0" />
            <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-5 text-left">{copy}</p>
          </div>
        </div>

        <button className="btn-ghost w-full" onClick={() => setResult(null)}>發布到其他平台</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Ad preview */}
      <div className="card">
        <p className="text-xs text-gray-500 mb-3">廣告預覽</p>
        <div className="flex gap-3">
          <img src={imageUrl} alt="ad" className="w-20 h-20 object-cover rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-200 whitespace-pre-wrap line-clamp-4">{copy}</p>
            <p className="text-xs text-gray-500 mt-2">📅 {startDate} ~ {endDate}</p>
          </div>
        </div>
      </div>

      {/* Platform selector */}
      <div className="space-y-2">
        <label className="label">選擇發布平台</label>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
              ${selected === p.id ? 'border-brand bg-brand/10' : 'border-gray-700 hover:border-gray-500'}`}
          >
            <div className={`w-10 h-10 ${p.color} rounded-lg flex items-center justify-center font-bold text-white shrink-0 text-lg`}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{p.name}</p>
              <p className="text-sm text-gray-400">{p.desc}</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected === p.id ? 'border-brand bg-brand' : 'border-gray-600'}`} />
          </button>
        ))}
      </div>

      {/* Discord webhook input */}
      {selected === 'discord' && (
        <div className="space-y-2">
          <label className="label">Discord Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand"
          />
          <p className="text-xs text-gray-500">
            Discord 頻道設定 → 整合 → Webhook → 複製連結
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <button
        onClick={handlePublish}
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? <span className="animate-pulse">發布中...</span> : `發布到 ${PLATFORMS.find(p => p.id === selected)?.name}`}
      </button>

      {/* Download / copy */}
      <div className="flex gap-3">
        <a href={imageUrl} download="promo-image.png" target="_blank" rel="noreferrer"
          className="btn-ghost flex-1 text-center text-sm py-2">⬇️ 下載圖片</a>
        <button onClick={() => navigator.clipboard.writeText(copy)} className="btn-ghost flex-1 text-sm">
          📋 複製文案
        </button>
      </div>

      <button className="btn-ghost w-full" onClick={onBack} disabled={loading}>← 返回</button>
    </div>
  );
}
