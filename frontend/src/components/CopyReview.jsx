import { useState } from 'react';

export default function CopyReview({ variations, onConfirm, onBack }) {
  const [selected, setSelected] = useState(0);
  const [edited, setEdited] = useState('');
  const [editMode, setEditMode] = useState(false);

  const current = variations[selected];

  const fullCopy = current
    ? `${current.title}\n\n${current.body}\n\n${current.hashtags}`
    : '';

  const handleConfirm = () => {
    const copy = editMode ? edited : fullCopy;
    onConfirm({ copy, title: current.title, keywords: extractKeywords(current) });
  };

  const startEdit = () => {
    setEdited(fullCopy);
    setEditMode(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {variations.map((v, i) => (
          <button
            key={v.id}
            onClick={() => { setSelected(i); setEditMode(false); }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              selected === i
                ? 'border-brand bg-brand/10 text-brand-light'
                : 'border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {v.style || `版本 ${v.id}`}
          </button>
        ))}
      </div>

      {current && (
        <div className="card space-y-3">
          <p className="text-lg font-bold text-white">{current.title}</p>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{current.body}</p>
          <p className="text-brand-light text-sm">{current.hashtags}</p>
        </div>
      )}

      {editMode ? (
        <div>
          <label className="label">自訂文案</label>
          <textarea
            className="input h-44 resize-none text-sm"
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
          />
          <button
            className="text-xs text-gray-500 mt-1 hover:text-gray-300"
            onClick={() => setEditMode(false)}
          >
            取消編輯
          </button>
        </div>
      ) : (
        <button className="btn-ghost text-sm w-full" onClick={startEdit}>
          ✏️ 自訂修改文案
        </button>
      )}

      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={onBack}>← 返回</button>
        <button className="btn-primary flex-1 py-3" onClick={handleConfirm}>
          確認文案，生成圖片 →
        </button>
      </div>
    </div>
  );
}

function extractKeywords(variation) {
  const text = `${variation.title} ${variation.body} ${variation.hashtags}`;
  const tags = (variation.hashtags || '').match(/#\w+/g) || [];
  const keywords = tags.map((t) => t.replace('#', '')).slice(0, 3).join(' ');
  return keywords || variation.title || text.substring(0, 30);
}
