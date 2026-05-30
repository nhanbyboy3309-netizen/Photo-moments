
import React from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { SiteSettings } from '../../../types';

interface PaymentSettingsProps {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ settings, updateSettings, onSave, saving }) => {
  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Thanh toán & Thông báo</h2>
                <p className="text-zinc-400 text-sm">Cấu hình ngân hàng và email nhận tin.</p>
            </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Email Admin (Nhận thông báo)</label>
                <input 
                    type="email" required
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                    value={settings.adminNotificationEmail}
                    onChange={(e) => updateSettings({ adminNotificationEmail: e.target.value })}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Tên Ngân Hàng</label>
                    <input 
                        type="text" required
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                        value={settings.bankName}
                        onChange={(e) => updateSettings({ bankName: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Bin Code (VietQR)</label>
                    <input 
                        type="text" required
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                        value={settings.bankBin}
                        onChange={(e) => updateSettings({ bankBin: e.target.value })}
                    />
                </div>
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Số Tài Khoản</label>
                <input 
                    type="text" required
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white font-mono"
                    value={settings.bankAccountNo}
                    onChange={(e) => updateSettings({ bankAccountNo: e.target.value })}
                />
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Chủ Tài Khoản</label>
                <input 
                    type="text" required
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white uppercase"
                    value={settings.bankAccountName}
                    onChange={(e) => updateSettings({ bankAccountName: e.target.value })}
                />
            </div>
             <div className="pt-4">
                <button type="submit" disabled={saving} className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu thông tin thanh toán"}
                </button>
            </div>
        </form>
    </div>
  );
};

export default PaymentSettings;
