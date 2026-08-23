
import React, { useState, useEffect, memo } from 'react';
import { Edit3, CreditCard, LayoutTemplate, Lock, Users, Stamp, Printer, Menu } from 'lucide-react';
import { SiteSettings } from '../../types';

// Sub-components
import GeneralSettings from './settings/GeneralSettings';
import PaymentSettings from './settings/PaymentSettings';
import PrinterSettings from './settings/PrinterSettings';
import FeatureSettings from './settings/FeatureSettings';
import WatermarkSettings from './settings/WatermarkSettings';
import PartnerSettings from './settings/PartnerSettings';
import SecuritySettings from './settings/SecuritySettings';
import NavigationSettings from './settings/NavigationSettings';

interface SettingsTabProps {
  initialSettings: SiteSettings;
  onSave: (newSettings: SiteSettings) => Promise<void>;
}

type SettingSubTab = 'general' | 'navigation' | 'payment' | 'features' | 'security' | 'partners' | 'watermark' | 'printer';

const SettingsTab = memo(({ initialSettings, onSave }: SettingsTabProps) => {
  const [localSettings, setLocalSettings] = useState<SiteSettings>(initialSettings);
  const [activeSubTab, setActiveSubTab] = useState<SettingSubTab>('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      alert("Cập nhật cài đặt thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<SiteSettings>) => {
      setLocalSettings(prev => ({ ...prev, ...updates }));
  };

  const renderSidebarItem = (id: SettingSubTab, icon: React.ElementType, label: string) => (
    <button
      key={id}
      onClick={() => setActiveSubTab(id)}
      className={`p-3 md:p-4 rounded-xl transition-all group relative flex-shrink-0 flex md:block items-center justify-center gap-2 ${
        activeSubTab === id ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-center justify-center">
        {React.createElement(icon, { className: "w-5 h-5 md:w-6 md:h-6" })}
      </div>
      <span className="md:absolute md:left-full md:ml-4 md:bg-zinc-800 md:text-white md:text-xs md:px-2 md:py-1 md:rounded md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:whitespace-nowrap md:pointer-events-none md:z-50 md:border md:border-zinc-700 md:block font-bold text-xs md:font-normal">
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in max-w-6xl mx-auto items-start relative">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-auto flex md:flex-col gap-3 p-2 bg-zinc-900/80 rounded-2xl border border-zinc-800 sticky top-[70px] md:top-4 z-30 overflow-x-auto custom-scrollbar no-scrollbar">
         {renderSidebarItem('general', Edit3, 'Nội dung')}
         {renderSidebarItem('navigation', Menu, 'Menu')}
         {renderSidebarItem('payment', CreditCard, 'Thanh toán')}
         {renderSidebarItem('printer', Printer, 'Máy in')}
         {renderSidebarItem('features', LayoutTemplate, 'Dịch vụ')}
         {renderSidebarItem('watermark', Stamp, 'Watermark')}
         {renderSidebarItem('partners', Users, 'Đối tác')}
         {renderSidebarItem('security', Lock, 'Mật khẩu')}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 md:p-8 min-h-[400px]">
         {activeSubTab === 'general' && (
             <GeneralSettings settings={localSettings} updateSettings={updateSettings} onSave={handleSubmit} saving={saving} />
         )}
         {activeSubTab === 'navigation' && (
             <NavigationSettings settings={localSettings} updateSettings={updateSettings} onSave={handleSubmit} saving={saving} />
         )}
         {activeSubTab === 'payment' && (
             <PaymentSettings settings={localSettings} updateSettings={updateSettings} onSave={handleSubmit} saving={saving} />
         )}
         {activeSubTab === 'printer' && (
             <PrinterSettings settings={localSettings} updateSettings={updateSettings} onSave={handleSubmit} saving={saving} />
         )}
         {activeSubTab === 'features' && (
             <FeatureSettings settings={localSettings} updateSettings={updateSettings} onSave={handleSubmit} saving={saving} />
         )}
         {activeSubTab === 'watermark' && (
             <WatermarkSettings settings={localSettings} updateSettings={updateSettings} onSave={handleSubmit} saving={saving} />
         )}
         {activeSubTab === 'partners' && (
             <PartnerSettings />
         )}
         {activeSubTab === 'security' && (
             <SecuritySettings />
         )}
      </div>
    </div>
  );
});

export default SettingsTab;
