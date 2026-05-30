
import React, { useState, useEffect, memo, useRef } from 'react';
import { Package, Download, Upload, Search, FileSpreadsheet, QrCode, X, Save, RefreshCw, Printer, History, Square, CheckSquare, Grid, Loader2, Activity } from 'lucide-react';
import { Product, InventoryLog, SiteSettings } from '../../types';
import { getProducts, bulkImportProducts, updateProductStock, getInventoryLogs, getSettings } from '../../services/mockBackend';
import { parseCSV, exportToCSV, readFileAsText, formatCurrency, getQrUrl } from '../../utils/adminHelpers';

interface InventoryTabProps {
  settings: SiteSettings | null;
}

const InventoryTab = memo(({ settings: initialSettings }: InventoryTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'history'>('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<SiteSettings | null>(initialSettings);
  
  const [showBulkPrint, setShowBulkPrint] = useState(false);
  const [printCollection, setPrintCollection] = useState<Product[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => { 
    loadData(); 
    if (!settings) getSettings().then(setSettings);
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeSubTab === 'stock') setProducts(await getProducts());
    else setLogs(await getInventoryLogs());
    setLoading(false);
  };

  const handleBulkPrint = (mode: 'selected' | 'all') => {
      let items = mode === 'all' ? products : products.filter(p => selectedIds.has(p.id));
      if (items.length === 0) return alert("Chưa chọn sản phẩm.");
      setPrintCollection(items);
      setShowBulkPrint(true);
  };

  const executeFinalPrint = () => {
      setIsRendering(true);
      setTimeout(() => {
          window.print();
          setIsRendering(false);
      }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="w-6 h-6"/> Quản lý Kho</h2><p className="text-zinc-500 text-sm">Quản lý tồn kho và in tem nhãn sticker chuyên dụng.</p></div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-zinc-800 pb-2">
            <div className="flex gap-4">
                <button onClick={() => setActiveSubTab('stock')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'stock' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500'}`}>Tồn Kho</button>
                <button onClick={() => setActiveSubTab('history')} className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${activeSubTab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500'}`}>Lịch Sử</button>
            </div>
            {activeSubTab === 'stock' && (
                <div className="flex gap-2">
                    <button onClick={() => handleBulkPrint('selected')} disabled={selectedIds.size === 0} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">In {selectedIds.size} tem</button>
                    <button onClick={() => handleBulkPrint('all')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><Grid className="w-3 h-3" /> In tất cả</button>
                </div>
            )}
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/80 text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                    <tr>
                        <th className="p-4 w-10"></th>
                        <th className="p-4">Mã SP</th>
                        <th className="p-4">Sản Phẩm</th>
                        <th className="p-4">Tồn Kho</th>
                        <th className="p-4 text-center">In</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)).map(p => (
                        <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="p-4 text-center cursor-pointer" onClick={() => { const s = new Set(selectedIds); if(s.has(p.id)) s.delete(p.id); else s.add(p.id); setSelectedIds(s); }}>
                                {selectedIds.has(p.id) ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4 text-zinc-700" />}
                            </td>
                            <td className="p-4 font-mono text-zinc-400">{p.id}</td>
                            <td className="p-4 font-bold text-white">{p.name}</td>
                            <td className="p-4"><span className="bg-zinc-800 px-3 py-1 rounded-full font-mono text-xs">{p.stock}</span></td>
                            <td className="p-4 text-center"><button onClick={() => { setPrintCollection([p]); setShowBulkPrint(true); }} className="p-2 bg-zinc-800 rounded-lg hover:text-blue-500 transition-colors"><Printer className="w-4 h-4" /></button></td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>

        {showBulkPrint && (
            <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 text-white animate-fade-in no-print">
                <div className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setShowBulkPrint(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                        <div><h3 className="font-black uppercase tracking-widest text-sm">Trạm In Tem Sticker</h3><p className="text-[10px] text-zinc-500">Tommy 111 (14x21mm) • Dàn trang Vector</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="text-right"><p className="text-[10px] font-bold text-blue-500 uppercase">{printCollection.length} Bản ghi</p><p className="text-[10px] text-zinc-500">Mã hóa QR tốc độ cao</p></div>
                         <button onClick={executeFinalPrint} disabled={isRendering} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-900/20 flex items-center gap-2">
                             {isRendering ? <Loader2 className="w-4 h-4 animate-spin"/> : <Printer className="w-4 h-4"/>} KÍCH HOẠT LỆNH IN
                         </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-zinc-900/50 p-12 flex justify-center custom-scrollbar">
                    {isRendering ? (
                        <div className="flex flex-col items-center justify-center space-y-4 animate-pulse">
                            <Activity className="w-12 h-12 text-blue-500" />
                            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">Đang đẩy dữ liệu tới máy in...</p>
                        </div>
                    ) : (
                        <div className="shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-zinc-800" id="bulk-sticker-area">
                            <div className="print-container">
                                {printCollection.map((p, index) => (
                                    <div key={index} className="tomy-sticker">
                                        <div className="sticker-qr"><img src={getQrUrl(p.id, settings?.logoImageUrl, 100)} alt=""/></div>
                                        <div className="sticker-info"><p className="s-id">{p.id}</p><p className="s-name">{p.name}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <style>{`
                    .print-container { width: 210mm; min-height: 297mm; background: white; display: flex; flex-wrap: wrap; padding: 5mm; gap: 1.2mm; align-content: flex-start; }
                    .tomy-sticker { width: 14mm; height: 21mm; background: white; border: 0.05mm solid #f5f5f5; display: flex; flex-direction: column; align-items: center; padding: 0.4mm; box-sizing: border-box; overflow: hidden; }
                    .sticker-qr { width: 11.5mm; height: 11.5mm; margin-bottom: 0.3mm; }
                    .sticker-qr img { width: 100%; height: 100%; object-fit: contain; }
                    .sticker-info { text-align: center; line-height: 0.9; }
                    .s-id { font-size: 4.5px; font-weight: 900; font-family: monospace; color: black; margin: 0; letter-spacing: -0.1mm; }
                    .s-name { font-size: 3.5px; color: #666; white-space: nowrap; overflow: hidden; margin: 0; font-weight: 500; }
                    @media print {
                        @page { size: A4; margin: 0; }
                        body * { visibility: hidden; }
                        #bulk-sticker-area, #bulk-sticker-area * { visibility: visible; }
                        #bulk-sticker-area { position: absolute; left: 0; top: 0; width: 210mm; margin: 0; padding: 0; background: white; }
                        .tomy-sticker { border: none; }
                    }
                `}</style>
            </div>
        )}
    </div>
  );
});

export default InventoryTab;
