import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, ArrowRight, CheckCircle, Loader2, Copy, Check, ChevronLeft, ShieldCheck, ShieldAlert, MonitorPlay, ExternalLink, Zap, Lock, Store, Truck, Info } from 'lucide-react';
import { CartItem, SiteSettings, Order } from '../types';
import { getSettings, createOrder, confirmOrderPayment, checkAuth, updateOrderStatus, getOrderById } from '../services/mockBackend';
import { formatCurrency } from '../utils/adminHelpers';
import { PHOTO_BOOTH_PRO_URL } from '../utils/constants';
import { Link } from 'react-router-dom';

// --- CẤU HÌNH KẾT NỐI WEB APP THỰC THI ---
// Phải khớp với SERVICE_ENTRY_API_KEY trong id-photo-booth-pro/services/photoMomentsBridge.ts
const EXECUTION_APP_URL = PHOTO_BOOTH_PRO_URL;
const EXECUTION_API_KEY = "AIzaSyBIaBWwAjgGdrkSDWN0I9leNXUQtjDtSSk";

const Cart: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [step, setStep] = useState<'cart' | 'info' | 'payment'>('cart');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', email: '' });
  const [orderId, setOrderId] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnlineDelivery, setIsOnlineDelivery] = useState(false); // Mặc định không giao hàng online (nhận tại quầy, tải trực tuyến)

  // Payment States
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isAdminConfirming, setIsAdminConfirming] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // useState không cập nhật kịp đồng bộ nếu 2 lần submit xảy ra trong cùng 1 tick
  // (bấm rất nhanh) — dùng ref để chặn chắc chắn ngay từ dòng đầu tiên.
  const isPlacingOrderRef = useRef(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
    getSettings().then(setSettings);
    setIsAdmin(checkAuth());
  }, []);

  // --- AUTO-POLLING: Tự động kiểm tra trạng thái thanh toán mỗi 3s ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (step === 'payment' && orderId && lastOrder?.status !== 'paid') {
      interval = setInterval(async () => {
        try {
          const freshOrder = await getOrderById(orderId);
          if (freshOrder && freshOrder.status === 'paid') {
            setLastOrder(freshOrder);
            console.log("Order confirmed by admin!");
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, orderId, lastOrder?.status]);

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id: string) => {
    updateCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    updateCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const currentShippingFee = isOnlineDelivery ? (settings?.shippingFee ?? 30000) : 0;
  const totalAmount = subtotal + currentShippingFee;

  const handleCheckout = async () => {
    // Chặn bấm/submit 2 lần (mạng chậm, double-click...) tạo 2 đơn hàng riêng biệt.
    // Dùng ref (đồng bộ ngay lập tức) thay vì chỉ dựa vào state (có thể chưa kịp
    // cập nhật nếu 2 lần gọi xảy ra trong cùng 1 tick).
    if (isPlacingOrderRef.current) return;
    isPlacingOrderRef.current = true;
    setIsPlacingOrder(true);

    const newId = `ORD${Date.now().toString().slice(-6)}`;
    setOrderId(newId);

    const finalCustomer = isOnlineDelivery ? {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email
    } : {
        name: customer.name || 'Khách hàng tại quầy',
        phone: customer.phone || '0000000000',
        address: 'Nhận tại cửa hàng / Tải trực tuyến',
        email: customer.email || 'offline@photomoments.vn'
    };

    const order: Order = {
        id: newId,
        customerName: finalCustomer.name,
        customerPhone: finalCustomer.phone,
        customerAddress: finalCustomer.address,
        customerEmail: finalCustomer.email,
        items: cart,
        uploadedFiles: [],
        total: totalAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        isOnlineOrder: isOnlineDelivery,
        shippingFee: currentShippingFee,
        paymentMethod: 'transfer'
    };
    
    try {
        await createOrder(order);
        setLastOrder(order);
        setStep('payment');
        localStorage.removeItem('cart');
    } finally {
        isPlacingOrderRef.current = false;
        setIsPlacingOrder(false);
    }
  };

  const handleManualConfirmation = async () => {
    setIsConfirming(true);
    await confirmOrderPayment(orderId, totalAmount, customer.email);
    setTimeout(() => {
        setIsConfirming(false);
        setIsConfirmed(true);
    }, 1500);
  };

  const handleAdminConfirmation = async () => {
      if (!orderId) return;
      setIsAdminConfirming(true);
      try {
          await updateOrderStatus(orderId, 'paid');
          const freshOrder = await getOrderById(orderId);
          if (freshOrder) setLastOrder(freshOrder);
          alert("Admin: Đã xác nhận thanh toán thành công!");
      } catch (err) {
          console.error(err);
      } finally {
          setIsAdminConfirming(false);
      }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- LOGIC TẠO LINK THỰC THI DỊCH VỤ ---
  const getExecutionUrl = (item: CartItem) => {
      // 1. Trích xuất SỐ LƯỢNG ẢNH (Qty)
      let photoQty = 4; // Mặc định là gói cơ bản
      
      // Ưu tiên lấy từ metadata trong description
      if (item.description && item.description.includes('Tổng số ảnh:')) {
          const parts = item.description.split('Tổng số ảnh:');
          if (parts.length > 1) {
              const valStr = parts[1].trim(); 
              const parsed = parseInt(valStr);
              if (!isNaN(parsed)) photoQty = parsed;
          }
      } 
      else if (item.quantity > 1 && item.type === 'service') {
          photoQty = item.quantity * 4; 
      }

      // 2. Trích xuất KÍCH THƯỚC (Size)
      let photoSize = '4x6'; 
      const sizeRegex = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i;
      
      const nameMatch = item.name.match(sizeRegex);
      if (nameMatch) {
          photoSize = `${nameMatch[1]}x${nameMatch[2]}`; 
      } else {
          const descMatch = item.description.match(sizeRegex);
          if (descMatch) photoSize = `${descMatch[1]}x${descMatch[2]}`;
      }

      // 3. Tạo token bảo mật
      // QUAN TRỌNG: Khôi phục lại trường serviceCode để đảm bảo khớp schema của server
      const payloadObj = {
          orderId,
          serviceCode: item.serviceCode || 'SERVICE', // Đảm bảo luôn có giá trị
          size: photoSize,
          qty: photoQty,
          timestamp: Date.now()
      };
      
      const payload = btoa(JSON.stringify(payloadObj));

      const params = new URLSearchParams({
          mode: "service",
          orderId: orderId,
          token: payload,
          apiKey: EXECUTION_API_KEY
      });

      const finalUrl = `${EXECUTION_APP_URL}?${params.toString()}`;
      console.log(`[Service Execution] Generated URL for ${item.name}:`, finalUrl);
      return finalUrl;
  };

  const qrUrl = settings ? `https://img.vietqr.io/image/${settings.bankBin}-${settings.bankAccountNo}-compact2.jpg?amount=${totalAmount}&addInfo=${orderId}` : '';

  if (cart.length === 0 && step === 'cart') {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
            <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
            <Link to="/services" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200">
                Xem Dịch vụ
            </Link>
        </div>
    );
  }

  const isOrderPaid = lastOrder?.status === 'paid';
  const canExecuteService = isOrderPaid; 
  const serviceItems = lastOrder?.items.filter(item => item.type === 'service') || [];

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
      <div className="flex items-center justify-center mb-8 gap-4 text-sm font-medium text-zinc-500">
         <span className={step === 'cart' ? 'text-white' : ''}>1. Giỏ hàng</span>
         <span className="text-zinc-700">/</span>
         <span className={step === 'info' ? 'text-white' : ''}>2. Thông tin</span>
         <span className="text-zinc-700">/</span>
         <span className={step === 'payment' ? 'text-white' : ''}>3. Thanh toán</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {step === 'cart' && (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Giỏ hàng của bạn</h2>
                <div className="space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <img src={item.imageUrl || ''} alt="" className="w-16 h-16 object-cover rounded bg-zinc-800" />
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{item.name}</h3>
                                {item.type === 'service' && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">Dịch vụ</span>}
                                <p className="text-zinc-400 text-sm mt-1">{formatCurrency(item.price)}</p>
                                {item.description && item.type === 'service' && (
                                    <p className="text-[10px] text-zinc-500 mt-1">{item.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-1">
                                {item.type === 'service' ? (
                                    <span className="text-white font-mono w-8 text-center text-sm">1</span>
                                ) : (
                                    <>
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-zinc-700 rounded"><Minus className="w-4 h-4 text-white"/></button>
                                        <span className="text-white font-mono w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-zinc-700 rounded"><Plus className="w-4 h-4 text-white"/></button>
                                    </>
                                )}
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-500 ml-2"><Trash2 className="w-5 h-5"/></button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 border-t border-zinc-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-right w-full md:w-auto">
                        <p className="text-zinc-400 text-sm">Tổng cộng</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(totalAmount)}</p>
                    </div>
                    <button onClick={() => setStep('info')} className="w-full md:w-auto bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-zinc-200 flex items-center justify-center gap-2">
                        Tiếp tục <ArrowRight className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        )}

        {step === 'info' && (
            <div className="p-6 space-y-6">
                <button onClick={() => setStep('cart')} className="mb-2 text-zinc-400 hover:text-white flex items-center gap-1 text-sm"><ChevronLeft className="w-4 h-4"/> Quay lại</button>
                
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Hình thức nhận hàng</h2>
                    <p className="text-zinc-400 text-sm font-normal">Vui lòng lựa chọn hình thức thuận tiện nhất với bạn.</p>
                </div>

                {/* Tùy chọn Nhận hàng: Offline hoặc Online */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setIsOnlineDelivery(false)}
                        className={`p-5 rounded-2xl border text-left transition-all ${
                            !isOnlineDelivery 
                            ? 'bg-white/5 border-white shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                            : 'bg-black/25 border-zinc-800 hover:bg-zinc-850/40 hover:border-zinc-700'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${!isOnlineDelivery ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                <Store className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-white text-base">Nhận tại cửa hàng / Tải trực tuyến</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed pl-10">Mặc định, không cần nhập thông tin giao hàng chi tiết, miễn phí ship.</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsOnlineDelivery(true)}
                        className={`p-5 rounded-2xl border text-left transition-all ${
                            isOnlineDelivery 
                            ? 'bg-blue-900/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                            : 'bg-black/25 border-zinc-800 hover:bg-zinc-850/40 hover:border-zinc-700'
                        }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${isOnlineDelivery ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                <Truck className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-white text-base">Giao hàng tận nơi (Đơn Online)</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed pl-10">
                            Cộng thêm phí vận chuyển <strong className="text-blue-400">+{formatCurrency(settings?.shippingFee ?? 30000)}</strong> do cửa hàng thiết lập.
                        </p>
                    </button>
                </div>

                <div className="border-t border-zinc-800 pt-6">
                    <h3 className="text-xl font-bold text-white mb-4">
                        {isOnlineDelivery ? 'Thông tin giao hàng bắt buộc' : 'Thông tin liên hệ (Tùy chọn)'}
                    </h3>

                    <form onSubmit={(e) => { e.preventDefault(); handleCheckout(); }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-1">
                                    Họ và tên {isOnlineDelivery && <span className="text-red-500">*</span>}
                                </label>
                                <input 
                                    required={isOnlineDelivery} 
                                    type="text" 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:ring-1 focus:ring-white transition-all text-sm placeholder-zinc-600" 
                                    placeholder={isOnlineDelivery ? "Nhập họ tên người nhận..." : "Không bắt buộc (VD: Khách lẻ)..."}
                                    value={customer.name} 
                                    onChange={e => setCustomer({...customer, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-1">
                                    Số điện thoại {isOnlineDelivery && <span className="text-red-500">*</span>}
                                </label>
                                <input 
                                    required={isOnlineDelivery} 
                                    type="tel" 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:ring-1 focus:ring-white transition-all text-sm placeholder-zinc-600" 
                                    placeholder={isOnlineDelivery ? "Nhập số điện thoại giao hàng..." : "Không bắt buộc..."}
                                    value={customer.phone} 
                                    onChange={e => setCustomer({...customer, phone: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Các trường mở rộng khi là đơn hàng online */}
                        {isOnlineDelivery ? (
                            <div className="space-y-4 animate-fade-in mt-4">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-400 mb-1">Email nhận thông báo <span className="text-red-500">*</span></label>
                                    <input 
                                        required={true} 
                                        type="email" 
                                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:ring-1 focus:ring-white transition-all text-sm placeholder-zinc-600" 
                                        placeholder="customer@gmail.com"
                                        value={customer.email} 
                                        onChange={e => setCustomer({...customer, email: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zinc-400 mb-1">Địa chỉ nhận hàng chi tiết <span className="text-red-500">*</span></label>
                                    <textarea 
                                        required={true} 
                                        rows={3} 
                                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:ring-1 focus:ring-white transition-all text-sm placeholder-zinc-600" 
                                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                                        value={customer.address} 
                                        onChange={e => setCustomer({...customer, address: e.target.value})} 
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 flex items-start gap-2.5 text-zinc-400 text-xs text-left mt-4">
                                <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-zinc-300 mb-0.5">Tiện lợi, tối giản & bảo mật</p>
                                    <p className="leading-relaxed">Hệ thống không yêu cầu điền địa chỉ giao hàng và thông tin cá nhân. Bạn sẽ nhận hóa đơn kèm mã QR thanh toán tức thì sau 1 cú click.</p>
                                </div>
                            </div>
                        )}

                        {/* Chi tiết hóa đơn */}
                        <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 space-y-2 mt-6 text-left">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Tiền hàng:</span>
                                <span className="font-bold text-white">{formatCurrency(subtotal)}</span>
                            </div>
                            {isOnlineDelivery && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-400">Phí vận chuyển online:</span>
                                    <span className="font-bold text-blue-400">+{formatCurrency(settings?.shippingFee ?? 30000)}</span>
                                </div>
                            )}
                            <div className="border-t border-zinc-800 pt-2 flex justify-between text-base">
                                <span className="text-zinc-300 font-bold">Tổng thanh toán:</span>
                                <span className="font-extrabold text-white text-lg">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>

                        <button type="submit" disabled={isPlacingOrder} className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-zinc-200 mt-4 transition-all flex items-center justify-center gap-2 bg-gradient-to-r hover:opacity-90 active:scale-[0.99] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {isPlacingOrder ? <Loader2 className="w-5 h-5 animate-spin"/> : <>Xác nhận đặt hàng và thanh toán <ArrowRight className="w-5 h-5"/></>}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {step === 'payment' && (
            <div className="p-6 text-center space-y-6">
                
                {/* --- SERVICE EXECUTION SECTION --- */}
                {serviceItems.length > 0 && (
                    <div className={`border rounded-2xl p-6 mb-8 animate-fade-in shadow-xl transition-all ${
                        canExecuteService ? 'bg-gradient-to-br from-indigo-900/50 to-blue-900/50 border-blue-500/30' : 'bg-zinc-900 border-zinc-800'
                    }`}>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${canExecuteService ? 'bg-blue-600 animate-pulse' : 'bg-zinc-800'}`}>
                                {canExecuteService ? <Zap className="w-6 h-6 text-white" /> : <Lock className="w-5 h-5 text-zinc-500" />}
                            </div>
                            <h3 className={`text-xl font-bold ${canExecuteService ? 'text-white' : 'text-zinc-500'}`}>
                                {canExecuteService ? 'Dịch vụ đã sẵn sàng!' : 'Dịch vụ đang bị khóa'}
                            </h3>
                        </div>
                        
                        {canExecuteService ? (
                            <>
                                <p className="text-blue-200 text-sm mb-6 max-w-md mx-auto">
                                    Thanh toán đã được xác nhận. Nhấn nút bên dưới để chuyển sang ứng dụng thực thi.
                                </p>
                                <div className="grid gap-3">
                                    {serviceItems.map((item, index) => (
                                        <a 
                                            key={index}
                                            href={getExecutionUrl(item)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group w-full bg-white hover:bg-blue-50 text-blue-900 p-4 rounded-xl flex items-center justify-between transition-all transform hover:scale-[1.02] shadow-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover rounded-lg" alt=""/> : <MonitorPlay className="w-6 h-6 text-blue-600"/>}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-lg">{item.name}</p>
                                                    <p className="text-xs text-blue-600/70 font-medium uppercase tracking-wide">
                                                        {item.description ? item.description.split('|').pop()?.trim() : `SL: ${item.quantity}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-blue-600 text-white p-2 rounded-full group-hover:translate-x-1 transition-transform">
                                                <ExternalLink className="w-5 h-5" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-zinc-500 text-sm bg-black/20 p-4 rounded-xl border border-zinc-800">
                                <p>Vui lòng hoàn tất thanh toán và chờ hệ thống xác nhận để mở khóa quyền truy cập vào công cụ thực thi dịch vụ.</p>
                            </div>
                        )}
                    </div>
                )}
                {/* --------------------------------------- */}

                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Đặt hàng thành công!</h2>
                <p className="text-zinc-400">Mã đơn hàng: <span className="font-mono text-white font-bold">{orderId}</span></p>
                
                {isOrderPaid ? (
                    <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-2xl max-w-sm mx-auto animate-fade-in">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-green-500 mb-2">Đã thanh toán</h3>
                        <p className="text-zinc-400 text-sm">Đơn hàng đã được xác nhận. Bạn có thể sử dụng dịch vụ ngay.</p>
                    </div>
                ) : (
                    <div className="bg-white p-1.5 rounded-xl inline-block shadow-lg relative mx-auto">
                        <img src={qrUrl} alt="QR Code" className="w-64 h-64 object-contain block mx-auto" />
                    </div>
                )}

                {!isOrderPaid && (
                  <div className="max-w-md mx-auto space-y-3 text-sm text-left">
                       <div className="flex justify-between p-3 bg-black rounded-lg border border-zinc-800">
                            <span className="text-zinc-500">Ngân hàng</span>
                            <span className="font-bold text-white">{settings?.bankName}</span>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-black rounded-lg border border-zinc-800">
                            <span className="text-zinc-500">Số TK</span>
                            <div className="flex items-center gap-2">
                                 <span className="font-mono font-bold text-white">{settings?.bankAccountNo}</span>
                                 <button onClick={() => copyToClipboard(settings?.bankAccountNo || '', 'acc')} className="text-zinc-400 hover:text-white">
                                    {copiedField === 'acc' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                                  </button>
                            </div>
                       </div>
                       <div className="flex justify-between items-center p-3 bg-black rounded-lg border border-zinc-800">
                            <span className="text-zinc-500">Nội dung</span>
                            <div className="flex items-center gap-2">
                                 <span className="font-mono font-bold text-yellow-500">{orderId}</span>
                                 <button onClick={() => copyToClipboard(orderId, 'content')} className="text-zinc-400 hover:text-white">
                                    {copiedField === 'content' ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                                 </button>
                            </div>
                       </div>
                  </div>
                )}

                <div className="max-w-md mx-auto pt-4 flex gap-3 flex-col">
                    <div className="flex gap-3 w-full">
                        {!isOrderPaid && (
                            <div className="flex-1">
                                {isConfirmed ? (
                                    <div className="w-full text-center bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 flex flex-col items-center justify-center gap-1 text-yellow-500">
                                        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="w-5 h-5" /><span>Đang chờ duyệt</span></div>
                                        <span className="text-[10px] opacity-80">Vui lòng đợi Admin xác nhận</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleManualConfirmation}
                                        disabled={isConfirming}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95"
                                    >
                                        {isConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        Đã chuyển khoản
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {isAdmin && !isOrderPaid && (
                        <button 
                            onClick={handleAdminConfirmation}
                            disabled={isAdminConfirming}
                            className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            {isAdminConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                            Admin: Xác nhận thanh toán thành công
                        </button>
                    )}
                </div>

                {!isOrderPaid && !isConfirmed && (
                    <p className="text-zinc-500 text-xs italic">Vui lòng thanh toán để đơn hàng được ưu tiên xử lý sớm nhất.</p>
                )}
                
                <Link to="/" className="block w-full max-w-md mx-auto bg-zinc-800 text-white py-3 rounded-lg font-bold hover:bg-zinc-700">
                    Về trang chủ
                </Link>
            </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
