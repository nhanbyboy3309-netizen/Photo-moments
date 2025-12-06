import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, CheckCircle, AlertCircle, Loader2, Copy, Check, ChevronLeft, Maximize2, RefreshCw } from 'lucide-react';
import { getPhotoById, updatePhotoStatus, getSettings } from '../services/mockBackend';
import { Photo, SiteSettings } from '../types';
import WatermarkCanvas from '../components/WatermarkCanvas';

const ViewPhoto: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // VietQR Config (For demo purposes)
  const BANK_ID = "970416"; // ACB
  const ACCOUNT_NO = "41633207";
  const ACCOUNT_NAME = "NGUYEN TRUNG NHAN";
  
  // Use price from settings or default to 50000
  const AMOUNT = settings?.photoPrice || 50000;

  // Generate VietQR QuickLink
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${AMOUNT}&addInfo=PHOTO_${id}`;

  // Initial Load
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    // Load settings first
    const s = await getSettings();
    setSettings(s);

    // Then load photo
    const data = await getPhotoById(id);
    setPhoto(data);
    setLoading(false);
    
    if (data && data.status === 'pending') {
      setShowPayment(true);
    }
  };

  // 🔹 AUTOMATIC POLLING: Check for payment success every 2 seconds if pending
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (photo?.status === 'pending') {
      interval = setInterval(async () => {
        if (!id) return;
        const freshData = await getPhotoById(id);
        if (freshData && freshData.status === 'paid') {
          setPhoto(freshData);
          // Stop polling is handled by dependency change or component unmount
        }
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [photo?.status, id]);

  // Start the payment process
  const initPayment = async () => {
    if (!photo) return;
    setShowPayment(true);
    // Set status to pending to trigger the backend simulation and frontend polling
    await updatePhotoStatus(photo.id, 'pending');
    setPhoto(prev => prev ? { ...prev, status: 'pending' } : null);
  };

  const handleManualCheck = async () => {
    if (!id) return;
    setIsChecking(true);
    try {
        const freshData = await getPhotoById(id);
        if (freshData) {
            setPhoto(freshData);
        }
    } finally {
        // Small delay to make the interaction feel substantial
        setTimeout(() => setIsChecking(false), 500);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleFullscreen = () => {
    if (imageContainerRef.current) {
      if (!document.fullscreenElement) {
        imageContainerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Photo Not Found</h2>
        <p className="text-zinc-400 mb-8">The ID "{id}" does not exist in our system.</p>
        <Link to="/" className="bg-white text-black px-6 py-2 rounded-full hover:bg-zinc-200 font-medium">
          Back to Home
        </Link>
      </div>
    );
  }

  const isPaid = photo.status === 'paid';
  const isPending = photo.status === 'pending';

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] bg-black text-white font-sans">
      
      {/* 🔹 LEFT COLUMN (70%) */}
      <div className="w-full lg:w-[70%] flex flex-col p-4 lg:p-6 gap-4 border-b lg:border-b-0 lg:border-r border-zinc-900">
        
        {/* ID Header */}
        <div className="shrink-0">
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Mã ảnh: <span className="font-mono text-zinc-300">{photo.id}</span>
          </h1>
        </div>

        {/* Image Display Area */}
        <div 
          ref={imageContainerRef}
          className="flex-1 relative bg-zinc-900/30 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800 group"
        >
          {isPaid ? (
            <img 
              src={photo.url} 
              alt="Original" 
              className="max-h-full max-w-full object-contain shadow-2xl" 
            />
          ) : (
            <WatermarkCanvas imageUrl={photo.url} className="h-full w-full" />
          )}

          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
            title="Full Screen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 🔹 RIGHT COLUMN (30%) */}
      <div className="w-full lg:w-[30%] p-4 lg:p-6 flex flex-col bg-black overflow-y-auto">
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col justify-center shadow-sm">
          
          {isPaid ? (
            // PAID STATE
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-500">Thanh toán thành công!</h3>
                <p className="text-zinc-400 mt-2 text-sm">Cảm ơn bạn. Bạn có thể tải ảnh ngay.</p>
              </div>
              <a 
                href={photo.url} 
                download={`photo-${photo.id}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Tải ảnh gốc
              </a>
            </div>
          ) : (
            // UNPAID / PENDING STATE
            <div className="w-full">
              {!showPayment && !isPending ? (
                // INITIAL STATE
                <div className="text-center space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Thanh toán để tải ảnh</h2>
                    <p className="text-zinc-500 mt-2 text-sm">
                      Ảnh chất lượng cao, không watermark.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <button 
                      onClick={initPayment}
                      className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      Thanh toán ngay
                    </button>
                    <p className="text-zinc-500 text-sm">Giá: <span className="text-white font-bold">{formatCurrency(AMOUNT)}</span></p>
                  </div>
                </div>
              ) : (
                // PAYMENT FORM STATE
                <div className="animate-fade-in space-y-6">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setShowPayment(false)}
                      className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
                      // Disable back button while scanning to prevent breaking flow in demo
                      disabled={isPending} 
                    >
                      <ChevronLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <span className="text-lg font-bold text-white">{formatCurrency(AMOUNT)}</span>
                  </div>

                  <div className="space-y-6">
                    {/* QR Code */}
                    <div className="bg-white p-3 rounded-xl mx-auto w-48 h-48 shadow-lg relative">
                       <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                       
                       {/* Scanning Overlay Effect */}
                       {isPending && (
                         <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-green-500/30 rounded-xl animate-pulse"></div>
                         </div>
                       )}
                    </div>

                    {isPending && (
                      <div className="text-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                        <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                           <RefreshCw className="w-4 h-4 animate-spin" />
                           <span>Đang chờ ngân hàng xác nhận...</span>
                        </div>
                        <p className="text-xs text-zinc-500">Hệ thống đang tự động kiểm tra giao dịch.<br/>Vui lòng không tắt trình duyệt.</p>
                        
                        <button 
                          onClick={handleManualCheck}
                          disabled={isChecking}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto w-full"
                        >
                           {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                           Đã thanh toán? Kiểm tra ngay
                        </button>
                      </div>
                    )}

                    {/* Bank Details */}
                    <div className="space-y-3 text-xs md:text-sm">
                      <div className="flex justify-between p-3 bg-black rounded-lg border border-zinc-800">
                        <span className="text-zinc-500">Ngân hàng</span>
                        <span className="font-bold text-white">ACB</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-black rounded-lg border border-zinc-800">
                        <span className="text-zinc-500">Số TK</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{ACCOUNT_NO}</span>
                          <button onClick={() => copyToClipboard(ACCOUNT_NO, 'acc')} className="text-zinc-400 hover:text-white">
                            {copiedField === 'acc' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-black rounded-lg border border-zinc-800">
                        <span className="text-zinc-500">Nội dung</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-yellow-500">PHOTO_{id}</span>
                          <button onClick={() => copyToClipboard(`PHOTO_${id}`, 'content')} className="text-zinc-400 hover:text-white">
                            {copiedField === 'content' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPhoto;