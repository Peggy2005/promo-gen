import { useState } from 'react';
import CampaignForm from './components/CampaignForm';
import CopyReview from './components/CopyReview';
import StylePicker from './components/ImageSearch';
import ImagePreview from './components/ImagePreview';
import PublishPanel from './components/PublishPanel';
import { generateCopy, generateImage } from './api/client';

const STEPS = ['填寫資訊', '確認文案', '選擇風格', '確認圖片', '設定投放'];

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState(null);
  const [variations, setVariations] = useState([]);
  const [selectedCopy, setSelectedCopy] = useState({ copy: '', title: '', keywords: '' });
  const [generatedImage, setGeneratedImage] = useState('');
  const [lastStyle, setLastStyle] = useState('vibrant');

  const handleFormSubmit = async (data) => {
    setFormData(data);
    setError('');
    setLoading(true);
    try {
      const { data: res } = await generateCopy(data);
      setVariations(res.variations);
      setStep(1);
    } catch (e) {
      const msg = e.response?.data?.error || '文案生成失敗';
      const isLogin = e.response?.data?.loginRequired;
      setError(isLogin ? `${msg}（Chrome 視窗已開啟，登入 ChatGPT 後點「重試」）` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyConfirm = (copyData) => {
    setSelectedCopy(copyData);
    setStep(2);
  };

  const handleStyleConfirm = async ({ style }) => {
    setLastStyle(style);
    setImageLoading(true);
    setStep(3);
    try {
      const { data } = await generateImage({
        title: selectedCopy.title,
        keywords: selectedCopy.keywords,
        style,
      });
      setGeneratedImage(data.imageUrl);
    } catch (e) {
      setError(e.response?.data?.error || '圖片生成失敗');
    } finally {
      setImageLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setImageLoading(true);
    setGeneratedImage('');
    try {
      const { data } = await generateImage({
        title: selectedCopy.title,
        keywords: selectedCopy.keywords,
        style: lastStyle,
      });
      setGeneratedImage(data.imageUrl);
    } catch (e) {
      setError(e.response?.data?.error || '圖片生成失敗');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">PromoGen</h1>
          <p className="text-gray-400 text-sm">AI 廣告文案 × 宣傳圖生成 × 一鍵發布</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1 relative flex-1">
              {i < STEPS.length - 1 && (
                <div className={`absolute left-1/2 top-4 w-full h-0.5 transition-colors ${i < step ? 'bg-brand' : 'bg-gray-800'}`} />
              )}
              <div className={`step-indicator z-10 relative transition-all ${
                i < step ? 'bg-brand text-white' : i === step ? 'bg-brand/20 border-2 border-brand text-brand-light' : 'bg-gray-800 text-gray-600'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs text-center leading-tight ${i === step ? 'text-brand-light font-medium' : 'text-gray-600'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300 mb-4 flex justify-between items-start gap-2">
            <span>{error}</span>
            <div className="flex gap-2 shrink-0">
              {step === 0 && (
                <button
                  className="text-red-300 border border-red-600 rounded px-2 py-0.5 text-xs hover:bg-red-800/30"
                  onClick={() => { setError(''); document.querySelector('form')?.requestSubmit(); }}
                >
                  重試
                </button>
              )}
              <button className="text-red-400 hover:text-red-200" onClick={() => setError('')}>✕</button>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="card">
          {step === 0 && (
            <CampaignForm onSubmit={handleFormSubmit} loading={loading} />
          )}
          {step === 1 && (
            <CopyReview variations={variations} onConfirm={handleCopyConfirm} onBack={() => setStep(0)} />
          )}
          {step === 2 && (
            <StylePicker
              keywords={selectedCopy.keywords}
              onConfirm={handleStyleConfirm}
              onBack={() => setStep(1)}
              loading={imageLoading}
            />
          )}
          {step === 3 && (
            <ImagePreview
              imageUrl={generatedImage}
              copy={selectedCopy.copy}
              loading={imageLoading}
              onConfirm={() => setStep(4)}
              onRegenerate={handleRegenerate}
              onBack={() => { setStep(2); setGeneratedImage(''); }}
            />
          )}
          {step === 4 && formData && (
            <PublishPanel
              imageUrl={generatedImage}
              copy={selectedCopy.copy}
              title={selectedCopy.title}
              startDate={formData.startDate}
              endDate={formData.endDate}
              onBack={() => setStep(3)}
            />
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by ChatGPT Web (DALL-E) × Playwright × Blogger / Facebook
        </p>
      </div>
    </div>
  );
}
