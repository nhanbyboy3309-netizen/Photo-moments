import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, CheckCircle, AlertCircle, Loader2, Copy, Check, ChevronLeft, Maximize2 } from 'lucide-react';
import { getPhotoById, updatePhotoStatus } from '../services/mockBackend';
import { Photo } from '../types';
import WatermarkCanvas from '../components/WatermarkCanvas';

const ViewPhoto: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // VietQR Config (For demo purposes)
  const BANK_ID = "970416"; // ACB
  const ACCOUNT_NO = "41633207";
  const ACCOUNT_NAME = "NGUYEN TRUNG NHAN";
  const AMOUNT = 50000;
  // Generate VietQR QuickLink
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${AMOUNT}&addInfo=PHOTO_${id}`;

  useEffect(() => {
    if (id) {
      getPhotoById(id).then(data => {
        setPhoto(data);
        setLoading(false);
        // Automatically show payment info if status is pending
        if (data && data.status === 'pending') {
          setShowPayment(true);
        }
      });
    }
  }, [id]);

  const handlePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !email) return;

    setRequestStatus('submitting');
    // Simulate API call to request payment verification
    await updatePhotoStatus(photo.id, 'pending', email);
    
    // Refresh local state
    setPhoto(prev => prev ? { ...prev, status: 'pending', customerEmail: email } : null);
    setRequestStatus('submitted');
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
                <h3 className="text-xl font-bold text-green-500">Đã thanh toán</h3>
                <p className="text-zinc-400 mt-2 text-sm">Bạn có thể tải ảnh gốc ngay bây giờ.</p>
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
                      onClick={() => setShowPayment(true)}
                      className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      Thanh toán ngay
                    </button>
                    <p className="text-zinc-500 text-sm">Giá: <span className="text-white font-bold">50.000₫</span></p>
                  </div>
                </div>
              ) : (
                // PAYMENT FORM STATE
                <div className="animate-fade-in space-y-6">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setShowPayment(false)}
                      className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
                      disabled={isPending}
                    >
                      <ChevronLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <span className="text-lg font-bold text-white">50.000₫</span>
                  </div>

                  {isPending ? (
                    <div className="text-center py-6 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
                      <Loader2 className="w-10 h-10 text-yellow-500 animate-spin mx-auto mb-3" />
                      <h3 className="text-yellow-500 font-bold">Đang chờ xác nhận</h3>
                      <p className="text-zinc-500 text-xs mt-1">Vui lòng đợi trong giây lát...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* QR Code */}
                      <div className="bg-white p-3 rounded-xl mx-auto w-40 h-40 shadow-lg">
                        <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                      </div>

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

                      {/* Email Form */}
                      <form onSubmit={handlePaymentRequest} className="space-y-3 border-t border-zinc-800 pt-4">
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400 ml-1">Email nhận ảnh</label>
                          <input 
                            required
                            type="email" 
                            placeholder="example@gmail.com"
                            className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm focus:border-white focus:outline-none transition-colors text-white placeholder-zinc-600"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={requestStatus === 'submitting'}
                          className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm mt-2"
                        >
                          {requestStatus === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gửi yêu cầu thanh toán"}
                        </button>
                      </form>
                    </div>
                  )}
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
