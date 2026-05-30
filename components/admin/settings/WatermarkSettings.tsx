
import React from 'react';
import { Stamp, ImageIcon, Type, Loader2 } from 'lucide-react';
import { SiteSettings } from '../../../types';
import { readFileAsDataURL } from '../../../utils/adminHelpers';

interface WatermarkSettingsProps {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

const WatermarkSettings: React.FC<WatermarkSettingsProps> = ({ settings, updateSettings, onSave, saving }) => {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof SiteSettings) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) return alert("File ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        try {
            const base64 = await readFileAsDataURL(file);
            updateSettings({ [key]: base64 });
        } catch (err) {
            console.error(err);
        }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <Stamp className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Cấu hình Watermark</h2>
                <p className="text-zinc-400 text-sm">Tùy chỉnh watermark hiển thị trên ảnh chưa thanh toán.</p>
            </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-6">
           {/* Type Selector */}
           <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">Loại Watermark</label>
              <div className="flex gap-4">
                  {(['image', 'text'] as const).map(type => (
                      <button
                          key={type}
                          type="button"
                          onClick={() => updateSettings({ watermarkType: type })}
                          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-all ${
                              settings.watermarkType === type 
                              ? 'bg-white text-black border-white shadow-lg' 
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                          }`}
                      >
                          {type === 'image' ? <ImageIcon className="w-4 h-4"/> : <Type className="w-4 h-4"/>}
                          {type === 'image' ? 'Hình ảnh' : 'Văn bản'}
                      </button>
                  ))}
              </div>
           </div>

           <div className="bg-black/30 p-6 rounded-xl border border-zinc-800 space-y-4">
                {settings.watermarkType === 'text' ? (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Nội dung văn bản</label>
                        <input 
                            type="text"
                            className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                            value={settings.watermarkText}
                            onChange={(e) => updateSettings({ watermarkText: e.target.value })}
                            placeholder="Nhập nội dung watermark..."
                        />
                        <p className="text-xs text-zinc-500">Văn bản sẽ được hiển thị giữa ảnh với độ trong suốt 35%.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-zinc-300">Hình ảnh Watermark</label>
                        {settings.watermarkImageUrl && (
                            <div className="bg-zinc-800/50 p-4 rounded-lg flex flex-col items-center justify-center border border-zinc-700 border-dashed">
                                <img src={settings.watermarkImageUrl} alt="Watermark Preview" className="max-h-32 object-contain opacity-50" />
                                <p className="text-xs text-zinc-500 mt-2">Preview hiển thị (Opacity ~50%)</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <input 
                                type="file" 
                                accept="image/png,image/jpeg"
                                onChange={(e) => handleImageUpload(e, 'watermarkImageUrl')}
                                className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                            />
                            <p className="text-xs text-zinc-500">Khuyên dùng: Ảnh PNG nền trong suốt (Transparent).</p>
                        </div>
                    </div>
                )}
           </div>

           <div className="pt-4 border-t border-zinc-800">
                <button type="submit" disabled={saving} className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu cấu hình Watermark"}
                </button>
            </div>
        </form>
    </div>
  );
};

export default WatermarkSettings;
