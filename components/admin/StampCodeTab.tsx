
import React, { useState, useEffect, memo } from 'react';
import { Printer, Trash2, Loader2, X, Copy, Check, Layers, Square, CheckSquare, Stamp as StampIcon } from 'lucide-react';
import { Stamp, SiteSettings } from '../../types';
import { getStamps, createStamp, deleteStamp, getSettings } from '../../services/mockBackend';
import { getQrUrl } from '../../utils/adminHelpers';

const StampCodeTab = memo(() => {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  
  // Bulk Creation State
  const [bulkCount, setBulkCount] = useState<number>(10); 

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Printing State
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printCollection, setPrintCollection] = useState<Stamp[]>([]); 

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    getSettings().then(setSettings);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getStamps();
    setStamps(data);
    setLoading(false);
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === stamps.length && stamps.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(stamps.map(p => p.id)));
    }
  };

  const handleBulkCreate = async () => {
    if (bulkCount > 500) return alert("Giới hạn tạo 500 mã/lần.");
    if (bulkCount < 1) return alert("Số lượng phải lớn hơn 0");
    
    setCreating(true);
    try {
        const currentStamps = await getStamps();
        
        let maxNum = 0;
        currentStamps.forEach(s => {
            if (s.code) {
                const match = s.code.match(/ST(\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            }
        });

        const batchName = `Batch ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        const newBatchItems: Stamp[] = []; 

        for (let i = 1; i <= bulkCount; i++) {
             const nextNum = maxNum + i;
             const code = `ST${String(nextNum).padStart(3, '0')}`;
             
             const newItem: any = {
                code: code,
                label: batchName,
                isUsed: false
             };
             
             await createStamp(newItem);
             
             newBatchItems.push({
                 ...newItem,
                 id: Date.now() + i, 
                 createdAt: new Date().toISOString()
             });
        }

        await loadData(); 
        setPrintCollection(newBatchItems);
        setShowPrintPreview(true);

    } catch (e: any) {
        console.error(e);
        alert("Lỗi khi tạo hàng loạt: " + (e.message || e));
    } finally {
        setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
      if (confirm("Xóa mã này?")) {
          await deleteStamp(id);
          loadData();
      }
  };

  const handleCopy = (text: string, id: number) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePrintSelected = () => {
      if (selectedIds.size === 0) return alert("Chưa chọn mã nào.");
      const selectedItems = stamps.filter(p => selectedIds.has(p.id));
      setPrintCollection(selectedItems);
      setShowPrintPreview(true);
  };

  const triggerPrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><StampIcon className="w-5 h-5"/> Quản lý Stamp Code</h2>
                 <p className="text-zinc-400 text-sm">Tạo mã định danh (STxxx) để dán lên sản phẩm/ảnh.</p>
             </div>

             <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-zinc-500 text-xs font-bold uppercase">Số lượng:</span>
                    <input 
                        type="number" 
                        min="1" max="500"
                        className="bg-transparent text-white w-12 text-sm focus:outline-none text-center font-bold"
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Number(e.target.value))}
                    />
                 </div>
                 
                 <button 
                    onClick={handleBulkCreate}
                    disabled={creating}
                    className="bg-white text-black px-5 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                 >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Layers className="w-4 h-4" />}
                    Tạo & In Ngay
                 </button>

                 <div className="h-8 w-px bg-zinc-800 mx-2 hidden md:block"></div>

                 <button 
                    onClick={handlePrintSelected}
                    disabled={selectedIds.size === 0}
                    className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-500 flex items-center justify-center gap-2 transition-colors"
                 >
                     <Printer className="w-4 h-4" /> In Đã Chọn ({selectedIds.size})
                 </button>
             </div>
        </div>

        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
        ) : (
            <>
                <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 hover:text-white transition-colors">
                            {selectedIds.size > 0 && selectedIds.size === stamps.length ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}
                            {selectedIds.size === stamps.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                        <span>•</span>
                        <span>Tổng: {stamps.length} mã</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {stamps.map(s => (
                        <div 
                            key={s.id} 
                            className={`bg-zinc-900 border p-3 rounded-xl flex flex-col items-center gap-3 group transition-all relative ${selectedIds.has(s.id) ? 'border-blue-500/50 bg-blue-900/10' : 'border-zinc-800 hover:border-zinc-600'}`}
                        >
                             <div className="absolute top-2 right-2 z-10">
                                 <button onClick={() => toggleSelect(s.id)} className="text-zinc-600 hover:text-white">
                                     {selectedIds.has(s.id) ? <CheckSquare className="w-5 h-5 text-blue-500"/> : <Square className="w-5 h-5"/>}
                                 </button>
                             </div>

                             <div className="bg-white p-2 rounded-lg w-full aspect-square flex items-center justify-center cursor-pointer mt-4" onClick={() => toggleSelect(s.id)}>
                                 <img 
                                    src={getQrUrl(s.code, settings?.logoImageUrl, 150)} 
                                    alt="QR" 
                                    className="w-full h-full object-contain"
                                 />
                             </div>
                             
                             <div className="w-full text-center">
                                 <div className="flex items-center justify-center gap-2 mb-1">
                                     <h3 className="text-lg font-bold text-white font-mono tracking-wider">{s.code}</h3>
                                     <button onClick={() => handleCopy(s.code, s.id)} className="text-zinc-600 hover:text-white">
                                         {copiedId === s.id ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                                     </button>
                                 </div>
                                 <p className="text-zinc-500 text-[10px] truncate">{new Date(s.createdAt).toLocaleDateString()}</p>
                                 {s.isUsed ? (
                                    <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Đã dùng</span>
                                 ) : (
                                    <span className="text-[10px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Chưa dùng</span>
                                 )}
                             </div>
                             
                             <button onClick={() => handleDelete(s.id)} className="absolute top-2 left-2 text-zinc-700 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                    
                    {stamps.length === 0 && (
                        <div className="col-span-full text-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                            Chưa có mã nào. Hãy nhập số lượng và nhấn "Tạo & In Ngay".
                        </div>
                    )}
                </div>
            </>
        )}

        {showPrintPreview && (
             <div className="fixed inset-0 z-[100] flex flex-col bg-white text-black">
                 <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-gray-50 no-print shadow-sm z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowPrintPreview(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-6 h-6"/></button>
                        <div>
                            <h3 className="font-bold text-lg">In Mã Stamp (14x21mm)</h3>
                            <p className="text-xs text-gray-500">
                                Khổ giấy: A4 • Số lượng: {printCollection.length} tem
                            </p>
                        </div>
                    </div>
                    <button onClick={triggerPrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold flex items-center justify-center gap-2">
                         <Printer className="w-4 h-4"/> In Ngay
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-200 p-8 flex justify-center" id="stamp-print-area">
                    <div className="print-sheet">
                        {printCollection.map((s, idx) => (
                            <div key={idx} className="stamp-card">
                                <div className="stamp-qr">
                                    <img src={getQrUrl(s.code, settings?.logoImageUrl, 80)} alt="QR" />
                                </div>
                                <p className="stamp-code">{s.code}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <style>{`
                    .print-sheet {
                        width: 210mm; 
                        min-height: 297mm; 
                        background: white;
                        display: flex;
                        flex-wrap: wrap;
                        align-content: flex-start;
                        padding: 5mm; 
                        gap: 1mm; 
                    }

                    .stamp-card {
                        width: 14mm;  
                        height: 21mm; 
                        border: 1px dotted #e5e5e5; 
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 0.5mm;
                        box-sizing: border-box;
                        page-break-inside: avoid;
                        overflow: hidden;
                    }

                    .stamp-qr {
                        width: 11mm; 
                        height: 11mm;
                        flex-shrink: 0;
                        margin-bottom: 0.5mm;
                    }
                    .stamp-qr img { width: 100%; height: 100%; object-fit: contain; }

                    .stamp-code { 
                        font-size: 5px; 
                        font-weight: 900; 
                        font-family: Arial, sans-serif; 
                        text-align: center;
                        line-height: 1;
                        width: 100%;
                        white-space: nowrap;
                    }

                    @media print {
                        @page { size: A4; margin: 0; }
                        body * { visibility: hidden; }
                        #stamp-print-area, #stamp-print-area * { visibility: visible; }
                        #stamp-print-area {
                            position: absolute; left: 0; top: 0; width: 100%; height: auto;
                            background: white; margin: 0; padding: 0;
                        }
                        .print-sheet { border: none; padding: 5mm; }
                        .no-print { display: none; }
                    }
                `}</style>
             </div>
        )}
    </div>
  );
});

export default StampCodeTab;
