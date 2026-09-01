
import React, { useState } from 'react';
import { Printer, Loader2, CreditCard, Play, CheckCircle2, Info, Monitor, Plus, MousePointerClick, Zap } from 'lucide-react';
import { SiteSettings } from '../../../types';

interface PrinterSettingsProps {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

const COMMON_PRINTERS = [
    { id: 'canon_2900', name: 'Canon LBP 2900', brand: 'Canon', type: 'Laser B&W' },
    { id: 'canon_g3010', name: 'Canon Pixma G3010', brand: 'Canon', type: 'Inkjet Color' },
    { id: 'hp_laserjet', name: 'HP LaserJet Pro', brand: 'HP', type: 'Laser' },
    { id: 'epson_l3110', name: 'Epson L3110', brand: 'Epson', type: 'Inkjet' },
    { id: 'brother_2321', name: 'Brother HL-L2321D', brand: 'Brother', type: 'Laser Duplex' },
    { id: 'ricoh_aficio', name: 'Ricoh Aficio', brand: 'Ricoh', type: 'Digital' }
];

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ settings, updateSettings, onSave, saving }) => {
  const [testLoading, setTestLoading] = useState(false);

  const handleTestPrint = () => {
    setTestLoading(true);
    const testWindow = window.open('', '_blank', 'width=800,height=600');
    if (!testWindow) {
        alert("Vui lòng cho phép Pop-up để in thử.");
        setTestLoading(false);
        return;
    }

    testWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Test Print - ${settings.defaultPrinterName}</title>
          <style>
              @page { size: A4; margin: 0; }
              body { font-family: sans-serif; padding: 20mm; color: #333; }
              .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }
              .grid { display: grid; grid-template-columns: repeat(10, 1fr); border: 1px solid #ccc; height: 100mm; position: relative; }
              .grid div { border: 0.1mm solid #eee; }
              .info { margin-top: 20px; font-size: 14px; }
              .color-blocks { display: flex; gap: 10px; margin-top: 20px; }
              .block { width: 30px; height: 30px; border: 1px solid #000; }
              .status { color: green; font-weight: bold; margin-top: 40px; text-align: center; font-size: 20px; border: 4px dashed green; padding: 20px; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>KIỂM TRA KẾT NỐI MÁY IN</h1>
              <p>Hệ thống: PHOTO MOMENTS - Quản trị</p>
          </div>
          <div class="info">
              <p><strong>Máy in mục tiêu:</strong> ${settings.defaultPrinterName || 'Mặc định'}</p>
              <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <div class="grid">
              ${Array(100).fill('<div></div>').join('')}
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 10px; font-weight: bold; border: 2px solid #000;">ALIGNMENT OK</div>
          </div>
          <div class="status">TRÌNH ĐIỀU KHIỂN SẴN SÀNG</div>
          <script>
              window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 500);
              }
          </script>
      </body>
      </html>
    `);
    testWindow.document.close();
    setTestLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <Printer className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Quản lý Máy in & Thiết bị</h2>
                    <p className="text-zinc-400 text-sm">Cấu hình máy in đã cài đặt trên máy tính hiện tại.</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: DEVICE LIST & SELECTION */}
            <div className="lg:col-span-2 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Monitor className="w-4 h-4"/> Danh sách thiết bị sẵn có
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COMMON_PRINTERS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => updateSettings({ defaultPrinterName: p.name })}
                                className={`p-4 rounded-2xl border text-left transition-all relative group overflow-hidden ${
                                    settings.defaultPrinterName === p.name 
                                    ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/10' 
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase mb-1">{p.brand}</p>
                                        <h4 className={`font-bold text-base ${settings.defaultPrinterName === p.name ? 'text-white' : 'text-zinc-300'}`}>{p.name}</h4>
                                        <p className="text-zinc-500 text-xs mt-1">{p.type}</p>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${settings.defaultPrinterName === p.name ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                                        {settings.defaultPrinterName === p.name ? <CheckCircle2 className="w-5 h-5"/> : <Printer className="w-4 h-4"/>}
                                    </div>
                                </div>
                                {settings.defaultPrinterName === p.name && (
                                    <div className="absolute bottom-0 right-0 p-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MANUAL ENTRY */}
                <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                        <Plus className="w-4 h-4"/> Đăng ký máy in khác
                    </h3>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Tên máy in chính xác (Theo Control Panel)</label>
                        <input
                            type="text"
                            className="w-full bg-black border border-zinc-700 rounded-xl p-3 focus:border-white focus:outline-none transition-colors text-white font-bold"
                            value={settings.defaultPrinterName}
                            onChange={(e) => updateSettings({ defaultPrinterName: e.target.value })}
                            placeholder="Ví dụ: Canon LBP2900 (Copy 1)"
                        />
                    </div>
                </div>

                {/* ID CARD PRINT MODE */}
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Printer className="w-4 h-4"/> Chế độ in Thẻ Căn Cước
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => updateSettings({ idCardPrintMode: 'dialog' })}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                                settings.idCardPrintMode !== 'silent'
                                ? 'bg-blue-600/10 border-blue-500'
                                : 'bg-black border-zinc-800 hover:border-zinc-700'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <MousePointerClick className="w-4 h-4 text-blue-400"/>
                                <span className="font-bold text-white text-sm">Hộp thoại trình duyệt</span>
                            </div>
                            <p className="text-zinc-500 text-xs leading-relaxed">Mặc định. Hoạt động trên mọi hệ điều hành, nhân viên bấm "In" trong hộp thoại hiện ra.</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => updateSettings({ idCardPrintMode: 'silent' })}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                                settings.idCardPrintMode === 'silent'
                                ? 'bg-green-600/10 border-green-500'
                                : 'bg-black border-zinc-800 hover:border-zinc-700'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-green-400"/>
                                <span className="font-bold text-white text-sm">In thẳng qua Server</span>
                            </div>
                            <p className="text-zinc-500 text-xs leading-relaxed">Không cần thao tác. Chỉ hoạt động khi <code className="text-zinc-300">server.js</code> chạy trên máy Windows nối trực tiếp máy in <strong>{settings.defaultPrinterName || 'mặc định'}</strong>.</p>
                        </button>
                    </div>
                </div>

                {/* PRICING */}
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4"/> Đơn giá in ấn áp dụng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black p-3 rounded-xl border border-zinc-800">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Khổ A4</label>
                            <input type="number" value={settings.printPriceA4} onChange={e => updateSettings({ printPriceA4: Number(e.target.value) })} className="w-full bg-transparent text-white font-bold outline-none" />
                        </div>
                        <div className="bg-black p-3 rounded-xl border border-zinc-800">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Khổ A3</label>
                            <input type="number" value={settings.printPriceA3} onChange={e => updateSettings({ printPriceA3: Number(e.target.value) })} className="w-full bg-transparent text-white font-bold outline-none" />
                        </div>
                        <div className="bg-black p-3 rounded-xl border border-zinc-800">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Thẻ Căn Cước</label>
                            <input type="number" value={settings.printPriceIdCard} onChange={e => updateSettings({ printPriceIdCard: Number(e.target.value) })} className="w-full bg-transparent text-white font-bold outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: CONTROL & TEST */}
            <div className="space-y-6">
                <div className="bg-blue-600 p-6 rounded-3xl space-y-4 shadow-xl shadow-blue-900/20">
                    <div className="flex items-center gap-3 text-white">
                        <Play className="w-6 h-6 fill-current" />
                        <h3 className="text-lg font-bold">Kiểm tra kết nối</h3>
                    </div>
                    <p className="text-blue-100 text-sm leading-relaxed">
                        Tạo một trang in mẫu để kiểm tra Driver và độ căn lề thực tế của máy in <strong>{settings.defaultPrinterName || 'mặc định'}</strong>.
                    </p>
                    <button 
                        onClick={handleTestPrint}
                        disabled={testLoading}
                        className="w-full bg-white text-blue-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                        {testLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                        In trang thử nghiệm
                    </button>
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl flex gap-3 items-start">
                    <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                        Máy in phải được cài đặt chính thức trong Windows/MacOS/Linux để trình duyệt có thể gọi lệnh in.
                    </p>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-zinc-800 flex justify-end">
            <button 
                onClick={onSave} 
                disabled={saving} 
                className="bg-white text-black px-12 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
            >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Lưu toàn bộ cấu hình
            </button>
        </div>
    </div>
  );
};

export default PrinterSettings;
