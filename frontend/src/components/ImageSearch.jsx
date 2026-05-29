export default function StylePicker({ keywords, onConfirm, onBack, loading }) {
  const styles = [
    {
      value: 'vibrant',
      label: '活潑鮮豔',
      desc: '明亮色彩，充滿活力',
      emoji: '🌈',
      best: '活動、節慶、食品',
    },
    {
      value: 'elegant',
      label: '簡約高雅',
      desc: '精品質感，乾淨留白',
      emoji: '✨',
      best: '保養品、精品、服飾',
    },
    {
      value: 'lifestyle',
      label: '生活風格',
      desc: '自然真實，溫暖場景',
      emoji: '🌿',
      best: '旅遊、咖啡廳、美食',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card bg-gray-800/50">
        <p className="text-xs text-gray-500">DALL-E 生成圖片關鍵字</p>
        <p className="text-brand-light font-medium mt-1">{keywords}</p>
      </div>

      <div>
        <label className="label text-base font-semibold text-white mb-3 block">
          選擇廣告圖視覺風格
        </label>
        <div className="grid grid-cols-1 gap-3">
          {styles.map((s) => (
            <button
              key={s.value}
              onClick={() => !loading && onConfirm({ style: s.value })}
              disabled={loading}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-brand/60 hover:bg-brand/5 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } border-gray-700`}
            >
              <span className="text-3xl">{s.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-white">{s.label}</p>
                <p className="text-sm text-gray-400">{s.desc}</p>
                <p className="text-xs text-gray-600 mt-0.5">適合：{s.best}</p>
              </div>
              {loading ? (
                <Spinner />
              ) : (
                <span className="text-gray-600">→</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card text-center py-4">
          <p className="text-brand-light text-sm animate-pulse">
            Chrome 視窗已開啟，ChatGPT 生成中...
          </p>
          <p className="text-gray-500 text-xs mt-1">約需 30-90 秒，請勿關閉瀏覽器</p>
        </div>
      )}

      <button className="btn-ghost w-full" onClick={onBack} disabled={loading}>
        ← 返回
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-brand shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
