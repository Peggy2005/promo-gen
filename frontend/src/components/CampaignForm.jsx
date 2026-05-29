import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';

export default function CampaignForm({ onSubmit, loading }) {
  const [type, setType] = useState('event');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [details, setDetails] = useState('');

  const placeholder =
    type === 'event'
      ? '例如：\n活動名稱：阿里山太平雲梯螢火蟲季\n活動時間：5月1日至5月31日，每晚7點\n地點：嘉義縣竹崎鄉太平村\n票價：NT$350\n特色：全台最長景觀吊橋，夜間螢火蟲導覽'
      : '例如：\n商品名稱：極光保濕精華液\n主要成分：玻尿酸、積雪草\n效果：72小時深層保濕、改善細紋\n容量：30ml\n原價：NT$1,280，活動價NT$890';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !details.trim()) return;
    onSubmit({
      campaignType: type,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      details: details.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Toggle */}
      <div>
        <label className="label">宣傳類型</label>
        <div className="flex gap-3">
          {[
            { value: 'event', label: '活動宣傳', icon: '🎉' },
            { value: 'product', label: '商品推廣', icon: '🛍️' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                type === opt.value
                  ? 'border-brand bg-brand/10 text-brand-light'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="mr-2">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">宣傳開始日</label>
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="選擇開始日期"
            className="input"
            dateFormat="yyyy/MM/dd"
            minDate={new Date()}
          />
        </div>
        <div>
          <label className="label">宣傳截止日</label>
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate || new Date()}
            placeholderText="選擇截止日期"
            className="input"
            dateFormat="yyyy/MM/dd"
          />
        </div>
      </div>

      {/* Details */}
      <div>
        <label className="label">
          {type === 'event' ? '活動資訊' : '商品 / 服務資訊'}
        </label>
        <textarea
          className="input h-44 resize-none"
          placeholder={placeholder}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
        />
        <p className="text-xs text-gray-500 mt-1">資訊越詳細，文案品質越好</p>
      </div>

      <button
        type="submit"
        className="btn-primary w-full py-3 text-base"
        disabled={loading || !startDate || !endDate || !details.trim()}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> AI 生成文案中...
          </span>
        ) : (
          '✨ 生成廣告文案'
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
