
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, FileText, Trash2, ChevronRight, Loader2, Plus, Minus, Eye, X, Layers3, CheckCircle, CreditCard, RefreshCw, Settings2, FileStack, CreditCard as IdCardIcon, Copy, Zap, Check, Activity, Cpu } from 'lucide-react';
import { getAppBaseUrl, formatCurrency, getQrUrl } from '../utils/adminHelpers';
import { PrintFile, calculatePrintCost, getSessionFiles, renderPdfToImages, calculateSheetsPerCopy, countFilePagesFromUrl } from '../services/printService';
import { createOrder, getSettings, getOrderById } from '../services/mockBackend';
import { SiteSettings } from '../types';
import PrintIdCardModule from './PrintIdCardModule';

type PrintMode = 'document' | 'idcard';
type PrintStatus = 'idle' | 'rendering' | 'optimizing' | 'sending' | 'completed';

const PrintDocument: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as PrintMode) || 'document';
  const [activeMode, setActiveMode] = useState<PrintMode>(initialMode);

  const [sessionId, setSessionId] = useState('');
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [step, setStep] = useState<'upload' | 'config' | 'payment' | 'completed'>('upload');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  
  const [orderId, setOrderId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // States cho Hệ thống In Chuyên Nghiệp
  const [printStatus, setPrintStatus] = useState<PrintStatus>('idle');
  const [printProgress, setPrintProgress] = useState(0);

  useEffect(() => {
    const mode = searchParams.get('mode') as PrintMode;
    if (mode && mode !== activeMode) setActiveMode(mode);
  }, [searchParams]);

  useEffect(() => {
    const sid = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionId(sid);
    getSettings().then(setSettings);
  }, []);

  // Polling files
  useEffect(() => {
    if (activeMode !== 'document' || step !== 'upload') return;
    const interval = setInterval(async () => {
        if (!sessionId) return;
        const serverFiles = await getSessionFiles(sessionId);
        for (const sf of serverFiles) {
            setFiles(prev => {
                if (!prev.find(p => p.url === sf.url)) {
                    analyzeFileAtStation(sf);
                    return [...prev, sf];
                }
                return prev;
            });
        }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, step, activeMode]);

  useEffect(() => {
      if (step !== 'payment' || !orderId) return;
      const interval = setInterval(async () => {
          const order = await getOrderById(orderId);
          if (order && order.status === 'paid') {
              setStep('completed');
              clearInterval(interval);
          }
      }, 3000);
      return () => clearInterval(interval);
  }, [step, orderId]);

  const analyzeFileAtStation = async (file: PrintFile) => {
      try {
          const info = await countFilePagesFromUrl(file.url, file.name);
          setFiles(prev => prev.map(p => p.url === file.url ? {
              ...p,
              isAnalyzing: false,
              config: { ...p.config, totalPages: info.totalPages, pageRangeEnd: info.totalPages }
          } : p));
      } catch (e) { console.error(e); }
  };

  const updateFileConfig = (id: string, field: keyof PrintFile['config'], value: any) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, config: { ...f.config, [field]: value } } : f));
  };

  const totalCost = useMemo(() => files.reduce((sum, f) => sum + calculatePrintCost(f, settings?.printPriceA4, settings?.printPriceA3), 0), [files, settings]);
  const totalPhysicalSheets = useMemo(() => files.reduce((sum, f) => sum + calculateSheetsPerCopy(f) * f.config.copies, 0), [files]);

  const handleCreateOrder = async () => {
      if (files.some(f => f.isAnalyzing)) return alert("Vui lòng đợi hệ thống phân tích xong.");
      setIsLoading(true);
      const newOrderId = `PRT${Date.now().toString().slice(-6)}`;
      setOrderId(newOrderId);
      await createOrder({ 
          id: newOrderId, customerName: 'Khách lẻ (Trạm in)', customerPhone: '', customerAddress: 'Trạm in', 
          customerEmail, items: [], uploadedFiles: files.map(f => f.url), 
          total: totalCost, status: 'pending', createdAt: new Date().toISOString() 
      });
      setStep('payment');
      setIsLoading(false);
  };

  // --- HỆ THỐNG IN NATIVE-LIKE ---
  const handlePrintAction = async () => {
      setPrintStatus('rendering');
      setPrintProgress(15);
      
      try {
          let iframe = document.getElementById('print-engine-core') as HTMLIFrameElement;
          if (!iframe) {
              iframe = document.createElement('iframe');
              iframe.id = 'print-engine-core';
              iframe.style.position = 'fixed';
              iframe.style.right = '100%';
              iframe.style.bottom = '100%';
              iframe.style.width = '0';
              iframe.style.height = '0';
              iframe.style.border = 'none';
              document.body.appendChild(iframe);
          }

          setPrintProgress(35);
          setPrintStatus('optimizing');

          let printContent = `<html><head><style>
            @page { size: auto; margin: 0mm; }
            body { margin: 0; padding: 0; background: white; font-family: sans-serif; }
            .page-container { width: 100%; position: relative; page-break-after: always; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .page-container img { width: 100%; height: 100%; object-fit: contain; }
            .grid-2 { display: grid; grid-template-rows: 1fr 1fr; height: 100vh; }
            .grid-4 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 100vh; }
          </style></head><body>`;

          for (const file of files) {
              const { pageRangeStart, pageRangeEnd, copies, pagesPerSheet } = file.config;
              const images = file.name.toLowerCase().endsWith('.pdf') 
                ? await renderPdfToImages(file.url, pageRangeStart, pageRangeEnd)
                : [file.url];

              for (let c = 0; c < copies; c++) {
                  let i = 0;
                  while (i < images.length) {
                      if (pagesPerSheet === 1) {
                          printContent += `<div class="page-container"><img src="${images[i]}"></div>`;
                          i++;
                      } else {
                          printContent += `<div class="page-container grid-${pagesPerSheet}">`;
                          for (let j = 0; j < pagesPerSheet && i < images.length; j++) {
                              printContent += `<img src="${images[i]}" style="border: 0.1mm solid #eee;">`;
                              i++;
                          }
                          printContent += `</div>`;
                      }
                  }
              }
          }
          printContent += `</body></html>`;

          setPrintProgress(70);
          setPrintStatus('sending');

          const doc = iframe.contentWindow?.document || iframe.contentDocument;
          if (doc) {
              doc.open();
              doc.write(printContent);
              doc.close();

              const images = doc.getElementsByTagName('img');
              await Promise.all(Array.from(images).map(img => {
                  if (img.complete) return Promise.resolve();
                  return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
              }));

              setPrintProgress(100);
              setTimeout(() => {
                  iframe.contentWindow?.focus();
                  iframe.contentWindow?.print();
                  setPrintStatus('completed');
              }, 500);
          }
      } catch (err) {
          console.error(err);
          alert("Lỗi engine in. Vui lòng thử lại.");
          setPrintStatus('idle');
      }
  };

  const uploadUrl = `${getAppBaseUrl()}#/print-upload/${sessionId}`;

  return (
    <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full min-h-screen animate-fade-in no-print">
        
        {/* MODAL TRẠM IN CHUYÊN NGHIỆP (OVERLAY) */}
        {printStatus !== 'idle' && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
                        <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${printProgress}%` }} />
                    </div>

                    <div className="relative">
                        <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-blue-500/20">
                            {printStatus === 'completed' ? (
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            ) : (
                                <Printer className="w-12 h-12 text-blue-500 animate-bounce" />
                            )}
                        </div>
                        {printStatus !== 'completed' && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest text-white shadow-lg">
                                {printProgress}%
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                            {printStatus === 'rendering' && 'Dàn trang tài liệu...'}
                            {printStatus === 'optimizing' && 'Tối ưu bản in...'}
                            {printStatus === 'sending' && 'Đang đẩy lệnh in...'}
                            {printStatus === 'completed' && 'Gửi lệnh thành công!'}
                        </h2>
                        <p className="text-zinc-500 text-sm font-medium">
                            {printStatus === 'rendering' && 'Đang chuyển đổi tệp sang định dạng Vector chất lượng cao.'}
                            {printStatus === 'optimizing' && 'Xử lý các lớp hình ảnh và tối ưu hóa mực in.'}
                            {printStatus === 'sending' && 'Vui lòng xác nhận trên hộp thoại hệ thống của máy tính.'}
                            {printStatus === 'completed' && 'Máy in đang hoạt động. Bạn có thể đóng cửa sổ này.'}
                        </p>
                    </div>

                    {printStatus !== 'completed' ? (
                        <div className="flex items-center justify-center gap-6 pt-4">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${printStatus === 'rendering' ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-lg' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                    <FileStack className="w-5 h-5"/>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase">Layout</span>
                            </div>
                            <div className="w-8 h-px bg-zinc-800" />
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${printStatus === 'optimizing' ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-lg' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                    <Cpu className="w-5 h-5"/>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase">Engine</span>
                            </div>
                            <div className="w-8 h-px bg-zinc-800" />
                            <div className="flex flex-col items-center gap-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${printStatus === 'sending' ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-lg' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                    <Activity className="w-5 h-5"/>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase">Buffer</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setPrintStatus('idle')} className="flex-1 bg-zinc-800 text-zinc-300 py-4 rounded-2xl font-bold hover:bg-zinc-700 transition-all uppercase text-xs tracking-widest">Tiếp tục in</button>
                            <button onClick={() => window.location.reload()} className="flex-1 bg-white text-black py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all uppercase text-xs tracking-widest shadow-xl">Hoàn thành</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-zinc-800 pb-6 gap-6">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                   <Printer className="w-8 h-8 text-blue-500"/> Trạm In Đa Năng
                </h1>
                <p className="text-zinc-500 mt-1">Hệ thống xử lý tệp tin và dàn trang tự động chuyên nghiệp.</p>
            </div>

            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-stretch md:self-auto shadow-inner">
                <button onClick={() => setActiveMode('document')} className={`flex-1 md:px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeMode === 'document' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                    <FileText className="w-4 h-4"/> In Tài Liệu
                </button>
                <button onClick={() => setActiveMode('idcard')} className={`flex-1 md:px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeMode === 'idcard' ? 'bg-green-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                    <IdCardIcon className="w-4 h-4"/> In Căn Cước
                </button>
            </div>
        </div>

        {activeMode === 'idcard' ? (
          <PrintIdCardModule 
            price={settings?.printPriceIdCard || 2000} 
            printerName={settings?.defaultPrinterName || 'Máy in mặc định'} 
            logoUrl={settings?.logoImageUrl}
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-2 space-y-4">
                  {step === 'upload' && files.length === 0 ? (
                      <div className="bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-[2rem] p-12 text-center group hover:border-blue-500/50 transition-colors">
                          <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8 inline-block transform group-hover:scale-105 transition-transform">
                              <img src={getQrUrl(uploadUrl, settings?.logoImageUrl, 200)} alt="QR" />
                          </div>
                          <h2 className="text-2xl font-bold text-white mb-2">Quét mã để tải tệp in</h2>
                          <p className="text-zinc-500 text-sm max-w-sm mx-auto">Tài liệu của bạn sẽ xuất hiện tại đây ngay sau khi tải lên từ điện thoại.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {files.map(file => (
                              <div key={file.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm hover:border-zinc-700 transition-colors">
                                  <div className="flex justify-between items-center mb-4">
                                      <div className="flex items-center gap-4">
                                          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-blue-500 border border-zinc-700 shadow-inner">
                                              {file.isAnalyzing ? <Loader2 className="w-7 h-7 animate-spin"/> : <FileText className="w-7 h-7"/>}
                                          </div>
                                          <div>
                                              <h3 className="font-bold text-white line-clamp-1">{file.name}</h3>
                                              <div className="flex gap-2 mt-1">
                                                  <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest">{file.isAnalyzing ? 'Analyzing...' : `${file.config.totalPages} Pages`}</span>
                                                  <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase tracking-widest">Ready</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))} className="p-3 text-zinc-500 hover:text-red-500 bg-zinc-800 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>
                                      </div>
                                  </div>

                                  {step === 'config' && !file.isAnalyzing && (
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-black/40 p-6 rounded-2xl border border-zinc-800/50 mt-4">
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Settings2 className="w-3 h-3"/> Khổ giấy</label>
                                              <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" value={file.config.paperSize} onChange={e => updateFileConfig(file.id, 'paperSize', e.target.value)}>
                                                  <option value="A4">A4 (Standard)</option><option value="A3">A3 (Large)</option><option value="A5">A5 (Small)</option>
                                              </select>
                                          </div>
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Copy className="w-3 h-3"/> Mặt in</label>
                                              <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" value={file.config.sides} onChange={e => updateFileConfig(file.id, 'sides', e.target.value)}>
                                                  <option value="1">Một mặt (Single)</option><option value="2">Hai mặt (Duplex)</option>
                                              </select>
                                          </div>
                                          <div className="space-y-2">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><FileStack className="w-3 h-3"/> Gom trang</label>
                                              <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" value={file.config.pagesPerSheet} onChange={e => updateFileConfig(file.id, 'pagesPerSheet', parseInt(e.target.value))}>
                                                  <option value={1}>Mặc định (1 trang)</option><option value={2}>2 trang / mặt</option><option value={4}>4 trang / mặt</option>
                                              </select>
                                          </div>
                                          <div className="col-span-full pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                                              <label className="text-sm font-bold text-zinc-400">Số bản sao (Copies)</label>
                                              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 w-40">
                                                  <button onClick={() => updateFileConfig(file.id, 'copies', Math.max(1, file.config.copies - 1))} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"><Minus className="w-5 h-5"/></button>
                                                  <input type="number" className="bg-transparent w-full text-center text-lg font-bold text-white outline-none" value={file.config.copies} onChange={e => updateFileConfig(file.id, 'copies', parseInt(e.target.value) || 1)} />
                                                  <button onClick={() => updateFileConfig(file.id, 'copies', file.config.copies + 1)} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"><Plus className="w-5 h-5"/></button>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="space-y-6">
                  {files.length > 0 && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl space-y-6 sticky top-24">
                          <h3 className="font-bold text-white text-xl flex items-center gap-2 border-b border-zinc-800 pb-5"><Layers3 className="w-6 h-6 text-blue-500"/> Xác nhận đơn</h3>
                          
                          {step === 'payment' ? (
                              <div className="space-y-6 text-center py-4">
                                  <div className="bg-white p-3 rounded-[1.5rem] inline-block shadow-lg border-4 border-zinc-800 relative flex items-center justify-center">
                                      <img src={`https://img.vietqr.io/image/${settings?.bankBin}-${settings?.bankAccountNo}-compact2.jpg?amount=${totalCost}&addInfo=${orderId}`} alt="QR" className="w-48 h-48" />
                                  </div>
                                  <div className="space-y-2">
                                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">Mã đơn: <span className="text-white font-mono">{orderId}</span></p>
                                      <p className="text-4xl font-black text-white">{formatCurrency(totalCost)}</p>
                                  </div>
                                  <div className="bg-blue-500/10 p-5 rounded-2xl flex items-center gap-4 text-left border border-blue-500/20 animate-pulse">
                                      <Zap className="w-6 h-6 text-blue-400 shrink-0"/>
                                      <p className="text-xs text-blue-400 font-medium leading-relaxed">Hệ thống sẽ tự động mở trạm in ngay sau khi nhận được thanh toán.</p>
                                  </div>
                              </div>
                          ) : step === 'completed' ? (
                              <div className="space-y-6 animate-fade-in">
                                  <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl text-center">
                                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                      <h4 className="text-xl font-bold text-green-500">Đã thanh toán</h4>
                                      <p className="text-zinc-400 text-xs mt-1">Máy in đã sẵn sàng nhận lệnh.</p>
                                  </div>
                                  <button onClick={handlePrintAction} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black hover:bg-blue-500 shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3 animate-bounce">
                                      <Printer className="w-6 h-6"/> KÍCH HOẠT TRẠM IN
                                  </button>
                                  <button onClick={() => window.location.reload()} className="w-full py-4 text-zinc-500 text-xs font-bold hover:text-white transition-colors flex items-center justify-center gap-2">
                                      <RefreshCw className="w-4 h-4"/> LÀM MỚI PHIÊN IN
                                  </button>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email nhận biên nhận</label>
                                      <input type="email" className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-blue-500 outline-none transition-all" placeholder="khachhang@email.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                                  </div>
                                  <div className="pt-6 border-t border-zinc-800 space-y-4">
                                      <div className="flex justify-between items-end">
                                          <div className="space-y-1">
                                            <span className="text-zinc-500 font-bold text-[10px] uppercase">Ước tính ({totalPhysicalSheets} tờ)</span>
                                            <div className="text-3xl font-black text-green-500">{formatCurrency(totalCost)}</div>
                                          </div>
                                          {step === 'upload' ? (
                                             <button onClick={() => setStep('config')} className="bg-white text-black p-4 rounded-2xl font-bold hover:bg-zinc-200 shadow-lg"><ChevronRight className="w-6 h-6"/></button>
                                          ) : (
                                             <button onClick={handleCreateOrder} disabled={isLoading || files.some(f => f.isAnalyzing)} className="bg-blue-600 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-500 shadow-xl flex items-center gap-2">
                                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><CreditCard className="w-5 h-5"/> Thanh toán</>}
                                             </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
        )}
    </div>
  );
};

export default PrintDocument;
