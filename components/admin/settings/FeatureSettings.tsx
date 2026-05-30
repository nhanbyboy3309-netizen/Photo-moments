
import React from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { SiteSettings } from '../../../types';
import { readFileAsDataURL } from '../../../utils/adminHelpers';

interface FeatureSettingsProps {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({ settings, updateSettings, onSave, saving }) => {
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
                <LayoutTemplate className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Dịch vụ (3 Cột)</h2>
                <p className="text-zinc-400 text-sm">Chỉnh sửa 3 ảnh hiển thị cuối trang chủ.</p>
            </div>
        </div>
        <div className="space-y-6">
           {[1, 2, 3].map((num) => {
             const titleKey = `feature${num}Title` as keyof SiteSettings;
             const imgKey = `feature${num}ImageUrl` as keyof SiteSettings;
             return (
                <div key={num} className="bg-black/30 p-4 rounded-xl border border-zinc-800 space-y-3">
                   <h3 className="font-bold text-zinc-400 text-xs uppercase">Vị trí {num}</h3>
                   <div className="flex gap-4 items-start">
                      <div className="w-16 h-20 bg-zinc-800 flex-shrink-0 rounded overflow-hidden border border-zinc-700">
                        <img src={settings[imgKey] as string} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text" 
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-white"
                          value={settings[titleKey] as string}
                          onChange={(e) => updateSettings({ [titleKey]: e.target.value })}
                        />
                        <input 
                          type="file" accept="image/*"
                          className="w-full text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-zinc-800 file:text-white cursor-pointer"
                          onChange={(e) => handleImageUpload(e, imgKey)}
                        />
                      </div>
                   </div>
                </div>
             )
           })}
           <div className="pt-4">
                <button onClick={onSave} disabled={saving} className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cập nhật dịch vụ"}
                </button>
            </div>
        </div>
    </div>
  );
};

export default FeatureSettings;
