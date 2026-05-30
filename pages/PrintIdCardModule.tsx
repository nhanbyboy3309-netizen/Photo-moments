
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, Check, Printer, Scissors, Smartphone, ArrowRight, Loader2, Image as ImageIcon, QrCode, CreditCard, RefreshCw, Trash2, CheckCircle, ZoomIn, ZoomOut, Maximize2, Sun, Contrast, Activity, Zap, Sliders, Move, ShieldCheck, Cpu, RotateCcw, RotateCw, Focus, Grid3X3, CornerUpLeft, Plus, Minus } from 'lucide-react';
import { formatCurrency, getAppBaseUrl, getQrUrl } from '../utils/adminHelpers';
import { getSessionFiles, cleanupSession } from '../services/printService';
import { createOrder, confirmOrderPayment, getOrderById } from '../services/mockBackend';
import { Order, CartItem } from '../types';

interface PrintIdCardModuleProps {
  price: number;
  printerName: string;
  logoUrl?: string; 
}

const ID_CARD_WIDTH_MM = 85.6;
const ID_CARD_HEIGHT_MM = 53.98;
const ID_RATIO = ID_CARD_WIDTH_MM / ID_CARD_HEIGHT_MM;

type Step = 'upload' | 'crop' | 'payment' | 'print';

const PrintIdCardModule: React.FC<PrintIdCardModuleProps> = ({ price, printerName, logoUrl: initialLogoUrl }) => {
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState<Step>('upload');
  
  // File Management
  const [incomingFiles, setIncomingFiles] = useState<{id: string, url: string, name: string}[]>([]);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  
  // Cropped Data
  const [croppedFront, setCroppedFront] = useState<string | null>(null);
  const [croppedBack, setCroppedBack] = useState<string | null>(null);

  // Crop Modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [croppingSide, setCroppingSide] = useState<'front' | 'back' | null>(null);

  // Payment
  const [copies, setCopies] = useState(1);
  const [orderId, setOrderId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);

  // Print Logic State
  const [printStatus, setPrintStatus] = useState<'idle' | 'preparing' | 'sending' | 'completed'>('idle');
  const [layout, setLayout] = useState<'A4_1Side' | 'A5_2Sides'>('A4_1Side');

  useEffect(() => {
    const sid = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionId(sid);
    return () => { cleanupSession(sid); };
  }, []);

  useEffect(() => {
    if (step !== 'upload') return;
    const interval = setInterval(async () => {
        if(!sessionId) return;
        const files = await getSessionFiles(sessionId);
        setIncomingFiles(files.map(f => ({ id: f.id || '', url: f.url || '', name: f.name || 'Unknown' })));
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, step]);

  useEffect(() => {
      if (step !== 'payment' || !orderId) return;
      const interval = setInterval(async () => {
          const order = await getOrderById(orderId);
          if (order && order.status === 'paid') {
              setIsPaid(true); setWaitingForAdmin(false); setStep('print');
              clearInterval(interval);
          }
      }, 3000);
      return () => clearInterval(interval);
  }, [step, orderId]);

  const handleCreateOrder = async () => {
      setProcessingPayment(true);
      const newOrderId = `IDC${Date.now().toString().slice(-6)}`;
      setOrderId(newOrderId);
      await createOrder({
          id: newOrderId, customerName: 'Khách In Thẻ', customerPhone: '', customerAddress: 'Tại quầy',
          customerEmail: '', items: [{ id: 'ID_CARD', name: 'In Thẻ Căn Cước', quantity: copies, price: price } as any],
          uploadedFiles: [], total: price * copies, status: 'pending', createdAt: new Date().toISOString(), paymentMethod: 'transfer'
      });
      setStep('payment');
      setProcessingPayment(false);
  };

  const handleConfirmPayment = async () => {
    if (!orderId) return;
    setProcessingPayment(true);
    try {
        await confirmOrderPayment(orderId, price * copies, '');
        setWaitingForAdmin(true);
    } catch (e) {
        console.error(e);
        alert("Lỗi khi gửi yêu cầu xác nhận.");
    } finally {
        setProcessingPayment(false);
    }
  };

  const executePrint = () => {
      setPrintStatus('preparing');
      
      const cardStyle = `width: ${ID_CARD_WIDTH_MM}mm; height: ${ID_CARD_HEIGHT_MM}mm; object-fit: cover; border: 0.1mm solid #eee;`;
      let pageCss = layout === 'A4_1Side' ? '@page { size: A4 portrait; margin: 0; }' : '@page { size: A5 landscape; margin: 0; }';
      
      let contentHtml = layout === 'A4_1Side' ? `
            <div class="sheet a4"><div class="row">
                <img src="${croppedFront}" style="${cardStyle}" /><div style="width: 10mm;"></div><img src="${croppedBack}" style="${cardStyle}" />
            </div></div>` : `
            <div class="sheet a5"><div class="pos-r"><img src="${croppedFront}" style="${cardStyle}" /></div></div>
            <div class="sheet a5"><div class="pos-l"><img src="${croppedBack}" style="${cardStyle}" /></div></div>`;

      let finalHtml = '';
      for(let i=0; i<copies; i++) finalHtml += contentHtml;

      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (!printWindow) {
          alert("Vui lòng cho phép Pop-up.");
          setPrintStatus('idle');
          return;
      }

      printWindow.document.write(`
        <html><head><style>
            ${pageCss}
            body { margin: 0; padding: 0; background: #fff; }
            .sheet { width: 210mm; position: relative; overflow: hidden; page-break-after: always; background: white; }
            .a4 { height: 297mm; } .a5 { height: 148mm; }
            .row { display: flex; justify-content: center; padding-top: 15mm; }
            .pos-r { position: absolute; top: 15mm; right: 15mm; }
            .pos-l { position: absolute; top: 15mm; left: 15mm; }
        </style></head><body>
            ${finalHtml}
            <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
        </body></html>
      `);
      printWindow.document.close();
      setPrintStatus('sending');
      setTimeout(() => setPrintStatus('completed'), 2000);
  };

  const uploadUrl = `${getAppBaseUrl()}#/print-upload/${sessionId}`;

  return (
    <div className="relative">
        {/* NATIVE-LIKE PRINT OVERLAY */}
        {printStatus !== 'idle' && (
            <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                    <Printer className={`w-12 h-12 ${printStatus === 'completed' ? 'text-green-500' : 'text-blue-500 animate-bounce'}`} />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">
                    {printStatus === 'preparing' && 'Khởi tạo Engine In...'}
                    {printStatus === 'sending' && 'Truyền dữ liệu thẻ...'}
                    {printStatus === 'completed' && 'Hoàn tất quy trình in!'}
                </h2>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                    {printStatus === 'preparing' && 'Hệ thống đang chuẩn bị tọa độ khớp mặt trước và mặt sau.'}
                    {printStatus === 'sending' && 'Đang gửi gói tin hình ảnh HD tới trình điều khiển máy in.'}
                    {printStatus === 'completed' && 'Máy in đã nhận đủ dữ liệu. Bạn có thể lấy thẻ sau vài giây.'}
                </p>
                <div className="flex gap-4 mt-12 w-full max-w-xs">
                     {printStatus === 'completed' && <button onClick={() => window.location.reload()} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Đóng trạm in</button>}
                </div>
            </div>
        )}

        {step === 'upload' && (
          <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
              <div className="flex-1 space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col items-center text-center">
                      <div className="bg-white p-3 rounded-3xl mb-6 shadow-2xl">
                          <img src={getQrUrl(uploadUrl, initialLogoUrl, 200)} alt="QR" className="w-48 h-48" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Truyền ảnh Thẻ Căn Cước</h3>
                      <p className="text-zinc-500 text-sm max-w-xs">Quét mã để tải mặt trước và mặt sau từ điện thoại của bạn.</p>
                      <div className="mt-6 flex items-center gap-3 bg-zinc-950/50 px-4 py-2 rounded-full border border-zinc-800">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Đang lắng nghe thiết bị...</span>
                      </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 min-h-[200px]">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-blue-400"/> Thư viện ảnh nhận được</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {incomingFiles.map((file, idx) => (
                              <div key={idx} className="bg-black p-2 rounded-2xl border border-zinc-800 group relative overflow-hidden transition-all hover:border-blue-500/50">
                                  <img src={file.url} className="w-full aspect-[3/2] object-cover bg-zinc-800 rounded-xl" alt="" />
                                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                      <button onClick={() => { setFrontImage(file.url); setCroppedFront(null); }} className="w-full bg-blue-600 text-white text-[10px] py-2 rounded-lg font-black uppercase">Mặt Trước</button>
                                      <button onClick={() => { setBackImage(file.url); setCroppedBack(null); }} className="w-full bg-green-600 text-white text-[10px] py-2 rounded-lg font-black uppercase">Mặt Sau</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="w-full lg:w-[400px] space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
                      <div className="space-y-2">
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Slot 1: Mặt Trước</span></div>
                          {frontImage ? (
                              <div className="aspect-[1.586] bg-black rounded-xl overflow-hidden relative group border border-blue-500/30">
                                  <img src={croppedFront || frontImage} className="w-full h-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button onClick={() => { setCropSrc(frontImage); setCroppingSide('front'); }} className="p-2 bg-white text-black rounded-full"><Scissors className="w-4 h-4"/></button>
                                      <button onClick={() => { setFrontImage(null); setCroppedFront(null); }} className="p-2 bg-red-600 text-white rounded-full"><X className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ) : (
                              <div className="aspect-[1.586] bg-black/50 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs font-bold uppercase tracking-widest">Trống</div>
                          )}
                      </div>

                      <div className="space-y-2">
                          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Slot 2: Mặt Sau</span></div>
                          {backImage ? (
                              <div className="aspect-[1.586] bg-black rounded-xl overflow-hidden relative group border border-green-500/30">
                                  <img src={croppedBack || backImage} className="w-full h-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button onClick={() => { setCropSrc(backImage); setCroppingSide('back'); }} className="p-2 bg-white text-black rounded-full"><Scissors className="w-4 h-4"/></button>
                                      <button onClick={() => { setBackImage(null); setCroppedBack(null); }} className="p-2 bg-red-600 text-white rounded-full"><X className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ) : (
                              <div className="aspect-[1.586] bg-black/50 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-xs font-bold uppercase tracking-widest">Trống</div>
                          )}
                      </div>

                      <div className="pt-4 border-t border-zinc-800">
                          <button 
                            disabled={!frontImage || !backImage}
                            onClick={() => { setStep('crop'); setCropSrc(frontImage); setCroppingSide('front'); }}
                            className="w-full bg-white disabled:opacity-20 text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-zinc-200 transition-colors shadow-lg flex items-center justify-center gap-2"
                          >
                              Tiếp tục <ArrowRight className="w-4 h-4"/>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
        )}

        {step === 'crop' && cropSrc && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
                <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
                    <h3 className="font-bold text-white flex items-center gap-2"><Scissors className="w-5 h-5"/> Cắt cúp: {croppingSide === 'front' ? 'Mặt Trước' : 'Mặt Sau'}</h3>
                    <button onClick={() => { 
                        if(croppingSide === 'front' && backImage) { setCropSrc(backImage); setCroppingSide('back'); }
                        else if(croppingSide === 'back') { handleCreateOrder(); }
                        else { setStep('upload'); }
                    }} className="text-zinc-400 hover:text-white font-bold text-sm">Bỏ qua</button>
                </div>
                <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-8">
                    <div className="relative border-2 border-blue-500 overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.2)]" style={{ width: '600px', height: `${600/ID_RATIO}px` }}>
                        <img src={cropSrc} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 border-[20px] border-black/50 pointer-events-none"></div>
                        <div className="absolute bottom-2 right-2 text-[10px] text-white/50 font-mono">85.6 x 54 mm</div>
                    </div>
                </div>
                <div className="h-24 border-t border-zinc-800 bg-zinc-900 flex items-center justify-center gap-8">
                    <button 
                        onClick={() => {
                            if (croppingSide === 'front') setCroppedFront(cropSrc); // Mock crop
                            else setCroppedBack(cropSrc);
                            
                            if (croppingSide === 'front') { setCropSrc(backImage); setCroppingSide('back'); }
                            else { handleCreateOrder(); }
                        }}
                        className="bg-white text-black px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-zinc-200 transition-colors shadow-lg"
                    >
                        {croppingSide === 'front' ? 'Tiếp tục: Mặt sau' : 'Hoàn tất & Thanh toán'}
                    </button>
                </div>
            </div>
        )}

        {step === 'payment' && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in min-h-[500px]">
                <div className="bg-white p-4 rounded-3xl shadow-2xl relative">
                    <img 
                      src={`https://img.vietqr.io/image/970416-41633207-compact2.jpg?amount=${price * copies}&addInfo=${orderId}`} 
                      alt="VietQR" 
                      className="w-64 h-64 object-contain"
                    />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Quét mã để thanh toán</p>
                    <h2 className="text-4xl font-black text-white">{formatCurrency(price * copies)}</h2>
                    <p className="text-zinc-600 text-sm font-mono bg-zinc-900/50 px-3 py-1 rounded-lg inline-block">{orderId}</p>
                </div>
                
                {waitingForAdmin ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
                        <Loader2 className="w-5 h-5 text-yellow-500 animate-spin"/>
                        <span className="text-yellow-500 font-bold text-sm">Đang chờ xác nhận từ Admin...</span>
                    </div>
                ) : (
                    <button 
                        onClick={handleConfirmPayment}
                        disabled={processingPayment}
                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-900/20 transition-transform active:scale-95"
                    >
                        {processingPayment ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                        Xác nhận đã chuyển khoản
                    </button>
                )}
            </div>
        )}

        {step === 'print' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500"><Printer className="w-8 h-8"/></div>
                    <h2 className="text-3xl font-bold text-white">Sẵn sàng in thẻ</h2>
                    <p className="text-zinc-400">Chọn cấu hình và tiến hành in.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
                        <h3 className="font-bold text-white flex items-center gap-2"><Sliders className="w-5 h-5"/> Cấu hình in</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-500 font-bold uppercase">Bố cục trang in</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setLayout('A4_1Side')}
                                        className={`p-4 rounded-xl border text-center transition-all ${layout === 'A4_1Side' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                    >
                                        <div className="mb-2 text-xs font-black uppercase">A4 (1 Mặt)</div>
                                        <div className="text-[10px] opacity-70">Ghép 2 mặt thẻ cạnh nhau</div>
                                    </button>
                                    <button 
                                        onClick={() => setLayout('A5_2Sides')}
                                        className={`p-4 rounded-xl border text-center transition-all ${layout === 'A5_2Sides' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                    >
                                        <div className="mb-2 text-xs font-black uppercase">A5 (2 Mặt)</div>
                                        <div className="text-[10px] opacity-70">In 2 lần (Lật giấy thủ công)</div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-zinc-500 font-bold uppercase">Số lượng bản in</label>
                                <div className="flex items-center gap-4 bg-black rounded-xl p-2 border border-zinc-800 w-fit">
                                    <button onClick={() => setCopies(Math.max(1, copies - 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-white"><Minus className="w-4 h-4"/></button>
                                    <span className="text-xl font-black text-white w-8 text-center">{copies}</span>
                                    <button onClick={() => setCopies(copies + 1)} className="p-2 hover:bg-zinc-800 rounded-lg text-white"><Plus className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="space-y-1">
                            <p className="text-zinc-500 text-xs font-bold uppercase">Máy in đích</p>
                            <p className="text-xl font-bold text-white">{printerName}</p>
                        </div>
                        <button 
                            onClick={executePrint}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-zinc-200 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3"
                        >
                            <Printer className="w-5 h-5"/> Tiến hành In
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PrintIdCardModule;
