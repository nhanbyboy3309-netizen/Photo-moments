
import React from 'react';
import { Edit3, ImageIcon, Type, Loader2 } from 'lucide-react';
import { SiteSettings } from '../../../types';
import { readFileAsDataURL } from '../../../utils/adminHelpers';

interface GeneralSettingsProps {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, updateSettings, onSave, saving }) => {
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
                <Edit3 className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Nội dung & Liên hệ</h2>
                <p className="text-zinc-400 text-sm">Chỉnh sửa thông tin, hotline và logo.</p>
            </div>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-6">
          {/* LOGO */}
          <div className="bg-black/30 p-4 rounded-xl border border-zinc-800 space-y-4">
            <label className="text-sm font-medium text-zinc-300 block mb-2">Logo hiển thị</label>
            <div className="flex gap-4">
              {(['image', 'text'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateSettings({ logoType: type })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border ${
                    settings.logoType === type 
                    ? 'bg-white text-black border-white' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {type === 'image' ? <ImageIcon className="w-4 h-4"/> : <Type className="w-4 h-4"/>}
                  {type === 'image' ? 'Hình ảnh' : 'Văn bản'}
                </button>
              ))}
            </div>

            {settings.logoType === 'text' ? (
               <input 
                 type="text"
                 className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                 value={settings.logoText}
                 onChange={(e) => updateSettings({ logoText: e.target.value })}
                 placeholder="Nhập tên thương hiệu..."
               />
            ) : (
              <div className="space-y-3">
                 {settings.logoImageUrl && (
                   <div className="bg-zinc-800 p-2 rounded-lg flex justify-center border border-zinc-700">
                     <img src={settings.logoImageUrl} alt="Logo Preview" className="max-h-24 object-contain" />
                   </div>
                 )}
                 <input 
                   type="file" 
                   accept="image/*"
                   onChange={(e) => handleImageUpload(e, 'logoImageUrl')}
                   className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                 />
              </div>
            )}
          </div>

          {/* HOTLINE */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Hotline</label>
            <input 
              type="text" required
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
              value={settings.hotline}
              onChange={(e) => updateSettings({ hotline: e.target.value })}
              placeholder="09232017925"
            />
          </div>

          {/* INFO */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Tiêu đề (Về chúng tôi)</label>
            <input 
              type="text" required
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
              value={settings.aboutTitle}
              onChange={(e) => updateSettings({ aboutTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Nội dung giới thiệu</label>
            <textarea 
              required rows={6}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white text-sm leading-relaxed"
              value={settings.aboutContent}
              onChange={(e) => updateSettings({ aboutContent: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Giá bán mặc định (VNĐ)</label>
            <input 
              type="number" required min="0" step="1000"
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
              value={settings.photoPrice}
              onChange={(e) => updateSettings({ photoPrice: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="pt-4">
            <button type="submit" disabled={saving} className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu thay đổi"}
            </button>
          </div>
        </form>
    </div>
  );
};

export default GeneralSettings;
