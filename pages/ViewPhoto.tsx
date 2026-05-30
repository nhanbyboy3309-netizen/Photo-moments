
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Download, CheckCircle, AlertCircle, Loader2, Copy, Check, ChevronLeft, Maximize2, Mail, ArrowRight, ShieldCheck, ExternalLink, Ticket } from 'lucide-react';
import { getPhotoById, updatePhotoStatus, getSettings, verifyPartnerCode, redeemPartnerCode } from '../services/mockBackend';
import { Photo, SiteSettings } from '../types';
import WatermarkCanvas from '../components/WatermarkCanvas';

type PaymentStep = 'intro' | 'email' | 'qr';

const ViewPhoto: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('intro');
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Local Access State (Persistent)
  const [localUnlocked, setLocalUnlocked] = useState(false);
  // Trạng thái người dùng đã nhấn nút "Xác nhận đã chuyển khoản"
  const [userConfirmedPayment, setUserConfirmedPayment] = useState(false);

  // Partner Code State
  const [partnerCode, setPartnerCode] = useState('');
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState<{type: 'error' | 'success' | 'info', text: string} | null>(null);
  const [discountType, setDiscountType] = useState<'none' | 'half' | 'free'>('none');

  // VietQR Config
  const BANK_ID = settings?.bankBin || "970416"; 
  const ACCOUNT_NO = settings?.bankAccountNo || "41633207";
  const BASE_AMOUNT = settings?.photoPrice || 50000;
  
  const FINAL_AMOUNT = discountType === 'half' ? BASE_AMOUNT / 2 : BASE_AMOUNT;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${FINAL_AMOUNT}&addInfo=PHOTO_${id}`;

  /** Logic tải ảnh HD bằng Blob để đảm bảo trình duyệt lưu file thay vì mở tab mới */
  const triggerDownload = async () => {
    if (!photo) return;
    try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `PHOTO_${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        // Fallback
        window.open(photo.url, '_blank');
    }
  };

  const grantAccess = (photoId: string, type: 'bank' | 'partner') => {
      setLocalUnlocked(true);
      if (type === 'bank') {
          localStorage.setItem(`access_bought_${photoId}`, 'true');
          localStorage.removeItem(`payment_pending_${photoId}`);
          localStorage.removeItem(`user_confirmed_${photoId}`);
      }
  };

  const loadData = async () => {
    if (!id) return;
    const s = await getSettings();
    setSettings(s);
    const data = await getPhotoById(id);
    setPhoto(data);
    setLoading(false);
    
    const isLocalPending = localStorage.getItem(`payment_pending_${id}`);
    const isUserConfirmed = localStorage.getItem(`user_confirmed_${id}`);
    
    if (data && data.status === 'pending' && isLocalPending) {
      setPaymentStep('qr');
      if (data.customerEmail) setEmail(data.customerEmail);
      if (isUserConfirmed === 'true') setUserConfirmedPayment(true);
    }
  };

  useEffect(() => {
    if (id) {
        const hasBought = localStorage.getItem(`access_bought_${id}`);
        if (hasBought === 'true') {
            setLocalUnlocked(true);
        }

        const paymentSuccess = searchParams.get('payment_success');
        if (paymentSuccess === 'true') {
            grantAccess(id, 'bank');
        }

        loadData();
    }
  }, [id, searchParams]);

  /** Tự động tải xuống nếu URL chứa ?download=true và ảnh đã được mở khóa */
  useEffect(() => {
    if (photo && localUnlocked && searchParams.get('download') === 'true') {
        const timer = setTimeout(() => {
            triggerDownload();
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('download');
            setSearchParams(newParams, { replace: true });
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [photo, localUnlocked, searchParams]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (id && !localUnlocked) {
      interval = setInterval(async () => {
        const freshData = await getPhotoById(id);
        const isLocalPending = localStorage.getItem(`payment_pending_${id}`);

        if (freshData) {
            setPhoto(freshData);
            if (freshData.status === 'paid' && isLocalPending) {
                grantAccess(id, 'bank');
                await updatePhotoStatus(id, 'unpaid');
            }
        }
      }, 3000); 
    }
    return () => clearInterval(interval);
  }, [id, localUnlocked]);

  const handleStartPayment = () => setPaymentStep('email');

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !email) return;
    setIsSubmittingEmail(true);
    localStorage.setItem(`payment_pending_${photo.id}`, 'true');

    try {
        await updatePhotoStatus(photo.id, 'pending', email);
        setPhoto(prev => prev ? { ...prev, status: 'pending', customerEmail: email } : null);
        setPaymentStep('qr');
    } catch (e) {
        alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
        setIsSubmittingEmail(false);
    }
  };

  const handleManualConfirmation = async () => {
    if (!id || !photo) return;
    setIsConfirming(true);
    try {
        await updatePhotoStatus(photo.id, 'pending', email);
        localStorage.setItem(`user_confirmed_${photo.id}`, 'true');
        setUserConfirmedPayment(true);
    } catch (e) {
        alert("Lỗi kết nối, vui lòng thử lại.");
    } finally {
        setIsConfirming(false);
    }
  };

  const handleApplyPartnerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode.trim() || !id) return;
    setIsCheckingCode(true);
    setPartnerMessage(null);
    try {
        const result = await verifyPartnerCode(partnerCode.trim(), id);
        if (result.valid) {
            if (result.type === 'free') {
                await redeemPartnerCode(partnerCode.trim(), id, 'free');
                grantAccess(id, 'partner');
                setPartnerMessage({ type: 'success', text: result.message });
            } else if (result.type === 'half') {
                setDiscountType('half');
                setPartnerMessage({ type: 'info', text: result.message });
            }
        } else {
            setPartnerMessage({ type: 'error', text: result.message });
            setDiscountType('none');
        }
    } catch (err) {
        setPartnerMessage({ type: 'error', text: "Lỗi kiểm tra mã." });
    } finally {
        setIsCheckingCode(false);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); 
    await triggerDownload();
    const isPersistent = localStorage.getItem(`access_bought_${photo?.id}`) === 'true';
    if (!isPersistent && photo) {
        setTimeout(() => window.location.reload(), 3000);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleFullscreen = () => {
    if (imageContainerRef.current) {
      if (!document.fullscreenElement) imageContainerRef.current.requestFullscreen();
      else document.exitFullscreen();
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-zinc-500 animate-spin" /></div>;

  if (!photo) return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Photo Not Found</h2>
      <Link to="/" className="bg-white text-black px-6 py-2 rounded-full hover:bg-zinc-200 font-medium">Back to Home</Link>
    </div>
  );

  const hasAccess = localUnlocked;

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] bg-black text-white font-sans">
      <div className="w-full lg:w-[70%] flex flex-col p-4 lg:p-6 gap-4 border-b lg:border-b-0 lg:border-r border-zinc-900">
        <div className="shrink-0"><h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Mã ảnh: <span className="font-mono text-zinc-300">{photo.id}</span></h1></div>
        <div ref={imageContainerRef} className="flex-1 relative bg-zinc-900/30 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800 group">
          {hasAccess ? (
             <img src={photo.url} alt="Original" className="max-h-full max-w-full object-contain shadow-2xl animate-fade-in" />
          ) : (
             <WatermarkCanvas 
                imageUrl={photo.url} 
                className="h-full w-full"
                watermarkType={settings?.watermarkType}
                watermarkText={settings?.watermarkText}
                watermarkUrl={settings?.watermarkImageUrl}
             />
          )}
          <button onClick={toggleFullscreen} className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"><Maximize2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="w-full lg:w-[30%] p-4 lg:p-6 flex flex-col bg-black overflow-y-auto">
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col justify-center shadow-sm">
          {hasAccess ? (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-8 h-8 text-green-500" /></div>
              <div><h3 className="text-xl font-bold text-green-500">Tuyệt vời!</h3><p className="text-zinc-400 mt-2 text-sm">Ảnh của bạn đã được mở khóa thành công.</p></div>
              <a href={photo.url} onClick={handleDownloadClick} className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(34,197,94,0.2)] active:scale-95"><Download className="w-5 h-5" /> Tải ảnh gốc (HD)</a>
              <a href={photo.url} target="_blank" rel="noreferrer" className="text-zinc-500 text-xs flex items-center justify-center gap-1 hover:text-white underline py-2"><ExternalLink className="w-3 h-3" /> Xem ảnh trong tab mới</a>
            </div>
          ) : (
            <div className="w-full flex flex-col h-full">
              {paymentStep === 'intro' && (
                <div className="text-center space-y-8 animate-fade-in mb-auto">
                  <div><h2 className="text-2xl font-bold text-white">Tải ảnh chất lượng cao</h2><p className="text-zinc-500 mt-2 text-sm">Xóa watermark và tải ảnh gốc sắc nét.</p></div>
                  <div className="space-y-4">
                    <button onClick={handleStartPayment} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2">Thanh toán ngay <ArrowRight className="w-5 h-5" /></button>
                    <p className="text-zinc-500 text-sm">Giá: <span className="text-white font-bold">{formatCurrency(FINAL_AMOUNT)}</span></p>
                  </div>
                </div>
              )}

              {paymentStep === 'email' && (
                 <div className="animate-fade-in space-y-6 mb-auto">
                    <div className="flex items-center justify-between"><button onClick={() => setPaymentStep('intro')} className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Quay lại</button><span className="text-lg font-bold text-white">{formatCurrency(FINAL_AMOUNT)}</span></div>
                    <div className="text-center space-y-2"><div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2"><Mail className="w-6 h-6 text-white" /></div><h2 className="text-xl font-bold">Email nhận ảnh</h2></div>
                    <form onSubmit={handleConfirmEmail} className="space-y-4 pt-4">
                        <div className="space-y-2"><label className="text-xs text-zinc-400 font-medium uppercase ml-1">Địa chỉ Email</label><input required type="email" placeholder="example@gmail.com" className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-600 focus:border-white focus:outline-none transition-colors" value={email} onChange={e => setEmail(e.target.value)} /></div>
                        <button type="submit" disabled={isSubmittingEmail} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors text-lg flex items-center justify-center gap-2">{isSubmittingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tiếp tục"}</button>
                    </form>
                 </div>
              )}

              {paymentStep === 'qr' && (
                <div className="animate-fade-in space-y-6 mb-auto">
                  <div className="flex items-center justify-between">
                    <button 
                        onClick={() => { setPaymentStep('intro'); setUserConfirmedPayment(false); }} 
                        className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
                        disabled={userConfirmedPayment}
                    >
                        {userConfirmedPayment ? <span className="opacity-30 flex items-center gap-1"><ChevronLeft className="w-4 h-4"/> Quay lại</span> : <><ChevronLeft className="w-4 h-4" /> Quay lại</>}
                    </button>
                    <span className="text-lg font-bold text-white">{formatCurrency(FINAL_AMOUNT)}</span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-3 rounded-xl mx-auto w-72 h-72 shadow-lg relative flex items-center justify-center">
                       <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                       {userConfirmedPayment && (
                         <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg animate-fade-in z-20">
                            <div className="text-center p-4">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                <span className="text-green-600 font-bold text-sm">Đã gửi yêu cầu</span>
                            </div>
                         </div>
                       )}
                    </div>

                    {userConfirmedPayment ? (
                      <div className="text-center bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold"><ShieldCheck className="w-5 h-5" /><span>Chờ Admin xác nhận</span></div>
                        <p className="text-xs text-zinc-400 leading-relaxed">Hệ thống đang kiểm tra giao dịch của bạn. Vui lòng không đóng trang này.</p>
                      </div>
                    ) : (
                      <div className="animate-fade-in space-y-4">
                        <div className="space-y-3 text-xs md:text-sm">
                          <div className="flex justify-between p-3 bg-black rounded-lg border border-zinc-800"><span className="text-zinc-500">Số TK</span><div className="flex items-center gap-2"><span className="font-mono font-bold text-white">{ACCOUNT_NO}</span><button onClick={() => copyToClipboard(ACCOUNT_NO, 'acc')} className="text-zinc-400 hover:text-white">{copiedField === 'acc' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}</button></div></div>
                          <div className="flex justify-between items-center p-3 bg-black rounded-lg border border-zinc-800"><span className="text-zinc-500">Nội dung</span><div className="flex items-center gap-2"><span className="font-mono font-bold text-yellow-500">PHOTO_{id}</span><button onClick={() => copyToClipboard(`PHOTO_${id}`, 'content')} className="text-zinc-400 hover:text-white">{copiedField === 'content' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}</button></div></div>
                        </div>
                         <button onClick={handleManualConfirmation} disabled={isConfirming} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">{isConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Xác nhận đã chuyển khoản</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-zinc-800">
                <form onSubmit={handleApplyPartnerCode} className="space-y-3">
                    <label className="text-xs text-zinc-500 uppercase font-bold flex items-center gap-1"><Ticket className="w-3 h-3" /> Mã ưu đãi / Đối tác</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Nhập mã..." className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-white focus:outline-none uppercase" value={partnerCode} onChange={(e) => setPartnerCode(e.target.value.toUpperCase())} />
                        <button type="submit" disabled={isCheckingCode || !partnerCode} className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">{isCheckingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dùng'}</button>
                    </div>
                    {partnerMessage && <div className={`text-xs p-2 rounded-lg ${partnerMessage.type === 'success' ? 'bg-green-500/10 text-green-500' : partnerMessage.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>{partnerMessage.text}</div>}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPhoto;
