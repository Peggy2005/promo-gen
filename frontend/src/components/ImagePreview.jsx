export default function ImagePreview({ imageUrl, copy, onConfirm, onRegenerate, onBack, loading }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">AI 生成宣傳圖</label>
        <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-square max-w-sm mx-auto">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-8 w-8 text-brand" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-gray-400 text-sm">DALL-E 3 生成中，約需 15-30 秒</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="Generated ad" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500">圖片載入失敗</p>
            </div>
          )}
        </div>
      </div>

      {imageUrl && !loading && (
        <>
          <div className="card">
            <p className="text-xs text-gray-500 mb-2">搭配文案預覽</p>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{copy}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={imageUrl}
              download="promo-image.png"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-center text-sm py-2"
            >
              ⬇️ 下載圖片
            </a>
            <button className="btn-ghost text-sm" onClick={onRegenerate} disabled={loading}>
              🔄 重新生成
            </button>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={onBack} disabled={loading}>← 返回</button>
        <button
          className="btn-primary flex-1 py-3"
          onClick={onConfirm}
          disabled={loading || !imageUrl}
        >
          確認圖片，設定投放 →
        </button>
      </div>
    </div>
  );
}
