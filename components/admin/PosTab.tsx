
import React, { useState, useEffect, memo, useRef } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, RotateCcw, User, Loader2, CheckCircle, X, Banknote, Wallet, Camera, ScanLine, ChevronUp, ChevronDown, Printer, ArrowRight, Share2, Copy } from 'lucide-react';
import { Product, Order, CartItem, SiteSettings } from '../../types';
import { getProducts, createOrder, getSettings } from '../../services/mockBackend';
import { formatCurrency, shareToZalo, getAppBaseUrl, getQrUrl } from '../../utils/adminHelpers';
// @ts-ignore
import { Html5Qrcode } from "html5-qrcode";

const PosTab = memo(() => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  
  const [showMobileCart, setShowMobileCart] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('Khách lẻ');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null); 
  const [copiedZalo, setCopiedZalo] = useState(false);

  useEffect(() => {
    loadData();
    if(scanInputRef.current) scanInputRef.current.focus();

    return () => {
        if (scannerRef.current) {
             try {
                 if(scannerRef.current.isScanning) {
                     scannerRef.current.stop();
                 }
                 scannerRef.current.clear();
             } catch(e) { console.warn(e); }
        }
    };
  }, []);

  const loadData = async () => {
    const [prodData, settingsData] = await Promise.all([
        getProducts(),
        getSettings()
    ]);
    setProducts(prodData);
    setSettings(settingsData);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const playBeep = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
    audio.volume = 0.5;
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
        alert("Sản phẩm hết hàng!");
        return;
    }

    setCart(prev => {
        const existing = prev.find(p => p.id === product.id);
        if (existing) {
            if (existing.quantity >= product.stock) {
                alert("Không đủ tồn kho!");
                return prev;
            }
            return prev.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p);
        }
        return [...prev, { ...product, quantity: 1 }];
    });
    setSearch(''); 
    if(scanInputRef.current) scanInputRef.current.focus();
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) return item;
            if (newQty < 1) return item;
            return { ...item, quantity: newQty };
        }
        return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          const code = search.trim();
          if (!code) return;
          const product = products.find(p => p.id === code);
          if (product) {
              addToCart(product);
          }
      }
  };

  useEffect(() => {
    let isMounted = true;
    const elementId = "reader";

    const cleanupScanner = async () => {
        if (scannerRef.current) {
            try {
                if(scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (err) {
                console.warn("Cleanup error", err);
            }
            scannerRef.current = null;
        }
    };

    if (isScanning) {
        const timer = setTimeout(async () => {
            if (!isMounted) return;
            await cleanupScanner(); 
            
            const element = document.getElementById(elementId);
            if (!element) return;

            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;
            
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            try {
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    (decodedText: string) => {
                        if (!isMounted) return;
                        const product = products.find(p => p.id === decodedText);
                        
                        if (product) {
                            playBeep();
                            addToCart(product);
                            html5QrCode.pause(true);
                            setTimeout(() => {
                                if(html5QrCode.isScanning) html5QrCode.resume();
                            }, 1000); 
                        }
                    },
                    (errorMessage: string) => {}
                );
            } catch (err) {
                console.error("Error starting scanner", err);
                if (isMounted) {
                    setIsScanning(false);
                    alert("Không thể khởi động camera.");
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    } else {
        cleanupScanner();
    }

    return () => {
        isMounted = false;
        cleanupScanner();
    }
  }, [isScanning, products]);

  const initiateCheckout = () => {
     if (cart.length === 0) return;
     const newOrderId = `POS${Date.now().toString().slice(-6)}`;
     setPendingOrderId(newOrderId);
     setPaymentMethod('cash'); 
     setCashGiven(0);
     setCompletedOrder(null); 
     setShowPaymentModal(true);
     setShowMobileCart(false);
  };

  const confirmPayment = async () => {
      setLoading(true);
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (paymentMethod === 'cash' && cashGiven < total) {
          alert("Số tiền khách đưa chưa đủ!");
          setLoading(false);
          return;
      }

      const order: Order = {
          id: pendingOrderId,
          customerName: customerName,
          customerPhone: customerPhone,
          customerAddress: 'Tại quầy',
          customerEmail: '',
          items: cart,
          uploadedFiles: [],
          total: total,
          status: 'paid', 
          createdAt: new Date().toISOString(),
          paymentMethod: paymentMethod
      };

      try {
          await createOrder(order, true); 
          setCompletedOrder(order);
          await loadData(); 
      } catch (e) {
          alert("Lỗi thanh toán");
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleFinishTransaction = () => {
      setShowPaymentModal(false);
      setCompletedOrder(null);
      setCart([]);
      setCustomerName('Khách lẻ');
      setCustomerPhone('');
      setCopiedZalo(false);
      if(scanInputRef.current) scanInputRef.current.focus();
  };

  const handleShareZalo = () => {
      if(completedOrder) {
          shareToZalo(completedOrder);
          setCopiedZalo(true);
          setTimeout(() => setCopiedZalo(false), 3000);
      }
  };

  const handlePrintReceipt = () => {
      if (!completedOrder) return;
      
      const printWindow = window.open('', '', 'width=600,height=800');
      if (!printWindow) return;

      const dateStr = new Date(completedOrder.createdAt).toLocaleString();
      const itemsHtml = completedOrder.items.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${item.name} <small>(x${item.quantity})</small></span>
            <span>${formatCurrency(item.price * item.quantity)}</span>
        </div>
      `).join('');
      
      const logoUrl = settings?.logoImageUrl || '';
      const hotline = settings?.hotline || '09232017925';
      const webUrl = getAppBaseUrl();

      printWindow.document.write(`
        <html>
          <head>
            <title>Hóa đơn ${completedOrder.id}</title>
            <style>
              body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              .text-center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .flex-between { display: flex; justify-content: space-between; }
              .footer { margin-top: 20px; font-size: 12px; text-align: center; }
              .logo { max-width: 80px; max-height: 80px; object-fit: contain; margin-bottom: 5px; }
              .qr-container { display: flex; justify-content: center; margin-top: 15px; margin-bottom: 5px; position: relative; }
              .qr-code { width: 100px; height: 100px; }
              .qr-logo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: white; padding: 2px; border-radius: 2px; }
            </style>
          </head>
          <body>
            <div class="text-center">
              ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <h2 style="margin:0; font-size: 1.2em;">${settings?.logoText || 'PHOTO MOMENTS'}</h2>
              <p style="margin:5px 0 0 0; font-size: 0.9em;">Hotline: ${hotline}</p>
              <p style="margin:5px 0; font-weight: bold;">Hóa Đơn Thanh Toán</p>
            </div>
            <div class="divider"></div>
            <p>Mã đơn: <strong>${completedOrder.id}</strong></p>
            <p>Ngày: ${dateStr}</p>
            <p>Khách: ${completedOrder.customerName}</p>
            <p>SĐT: ${completedOrder.customerPhone || '---'}</p>
            <div class="divider"></div>
            ${itemsHtml}
            <div class="divider"></div>
            <div class="flex-between bold" style="font-size: 16px;">
               <span>TỔNG CỘNG</span>
               <span>${formatCurrency(completedOrder.total)}</span>
            </div>
             <div class="flex-between" style="font-size: 12px; margin-top: 5px;">
               <span>Tiền mặt/CK:</span>
               <span>${formatCurrency(paymentMethod === 'cash' ? cashGiven : completedOrder.total)}</span>
            </div>
             <div class="flex-between" style="font-size: 12px;">
               <span>Tiền thừa:</span>
               <span>${formatCurrency(paymentMethod === 'cash' ? (cashGiven - completedOrder.total) : 0)}</span>
            </div>
            
            <div class="qr-container">
               <img src="${getQrUrl(webUrl, logoUrl, 150)}" class="qr-code" />
            </div>
            <p class="text-center" style="font-size: 10px; margin: 0;">Quét để truy cập Website</p>

            <div class="footer">
              <p>Cảm ơn quý khách!</p>
              <p>Hẹn gặp lại</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
      }, 500);
  };

  const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const changeDue = cashGiven > subTotal ? cashGiven - subTotal : 0;

  const BANK_ID = settings?.bankBin || "970416"; 
  const ACCOUNT_NO = settings?.bankAccountNo || "41633207";
  const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${subTotal}&addInfo=${pendingOrderId}`;

  const CartContent = ({ isMobile = false }) => (
    <div className={`flex flex-col h-full ${isMobile ? 'bg-zinc-900' : ''}`}>
        <div className="p-4 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-zinc-500" />
                <input 
                    type="text" 
                    placeholder="Tên khách hàng"
                    className="bg-black border border-zinc-700 rounded px-3 py-2 text-white w-full text-sm focus:outline-none focus:border-white"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                />
                {isMobile && (
                    <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-2 text-zinc-400">
                        <ChevronDown className="w-6 h-6" />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-3 pl-8">
                <input 
                    type="tel" 
                    placeholder="Số điện thoại (để gửi Zalo)"
                    className="bg-black border border-zinc-700 rounded px-3 py-2 text-white w-full text-sm focus:outline-none focus:border-white"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                    <ShoppingCart className="w-12 h-12 opacity-50" />
                    <p>Giỏ hàng trống</p>
                </div>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex gap-3 bg-black p-3 rounded-lg border border-zinc-800">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white text-sm font-bold truncate">{item.name}</h4>
                            <p className="text-zinc-500 text-xs">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-white hover:bg-zinc-700"><Minus className="w-4 h-4"/></button>
                            <span className="w-8 text-center text-white font-mono text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-white hover:bg-zinc-700"><Plus className="w-4 h-4"/></button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-500 ml-2">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))
            )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-black/30 space-y-4 shrink-0 pb-safe">
            <div className="flex justify-between items-end">
                <span className="text-zinc-400">Tổng tiền</span>
                <span className="text-3xl font-bold text-green-500">{formatCurrency(subTotal)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCart([])} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Hủy
                </button>
                <button 
                    onClick={initiateCheckout} 
                    disabled={loading || cart.length === 0}
                    className="bg-white hover:bg-zinc-200 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                    <CreditCard className="w-4 h-4" /> Thanh toán
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] animate-fade-in relative">
        <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex gap-2 shrink-0">
                <div className="flex-1 bg-zinc-900 border border-zinc-800 p-3 lg:p-4 rounded-xl flex items-center gap-3">
                    <Search className="w-5 h-5 text-zinc-500" />
                    <input 
                        ref={scanInputRef}
                        type="text" 
                        placeholder="Quét hoặc tìm..." 
                        className="bg-transparent border-none focus:ring-0 text-white w-full focus:outline-none text-base lg:text-lg"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={handleScan}
                    />
                </div>
                <button 
                    onClick={() => setIsScanning(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 lg:px-6 rounded-xl border border-zinc-700 flex flex-col items-center justify-center gap-1 min-w-[70px] lg:min-w-[100px]"
                >
                    <Camera className="w-5 h-5 lg:w-6 lg:h-6" />
                    <span className="text-[10px] lg:text-xs font-bold">Quét</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-2 lg:p-4 custom-scrollbar pb-24 lg:pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                    {filteredProducts.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => addToCart(p)}
                            className={`bg-black border border-zinc-800 rounded-lg overflow-hidden cursor-pointer hover:border-green-500 transition-all group ${p.stock <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="aspect-square bg-zinc-800 relative">
                                {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />}
                                {p.stock <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-red-500 font-bold text-xs">HẾT HÀNG</div>}
                                <div className="absolute top-1 right-1 lg:top-2 lg:right-2 bg-black/70 text-white text-[10px] lg:text-xs px-2 py-1 rounded font-mono">{p.stock}</div>
                            </div>
                            <div className="p-2 lg:p-3">
                                <h4 className="font-bold text-white text-xs lg:text-sm truncate">{p.name}</h4>
                                <p className="text-green-500 font-bold text-xs mt-1">{formatCurrency(p.price)}</p>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full text-center py-10 text-zinc-500">Không tìm thấy sản phẩm</div>
                    )}
                </div>
            </div>
        </div>

        <div className="hidden lg:flex w-[400px] flex-col bg-zinc-900 border border-zinc-800 rounded-xl shrink-0 h-full">
            <CartContent />
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-900 border-t border-zinc-800 p-4 pb-6 shadow-2xl safe-area-pb">
            <div className="flex items-center justify-between gap-4">
                <div onClick={() => setShowMobileCart(true)} className="flex-1 cursor-pointer">
                    <p className="text-zinc-400 text-xs flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4"/> 
                        <span>{totalItems} sản phẩm</span>
                    </p>
                    <p className="text-green-500 font-bold text-xl">{formatCurrency(subTotal)}</p>
                </div>
                <button 
                    onClick={() => setShowMobileCart(true)}
                    className="bg-white text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                    <ChevronUp className="w-4 h-4" /> Giỏ hàng
                </button>
            </div>
        </div>

        {showMobileCart && (
            <div className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-fade-in flex flex-col justify-end">
                <div 
                    className="bg-zinc-900 rounded-t-2xl h-[85vh] w-full overflow-hidden border-t border-zinc-700 shadow-2xl relative flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >   
                    <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setShowMobileCart(false)}>
                        <div className="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
                    </div>
                    <CartContent isMobile={true} />
                </div>
                <div className="absolute inset-0 z-[-1]" onClick={() => setShowMobileCart(false)}></div>
            </div>
        )}

        {isScanning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden relative">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                         <h3 className="font-bold text-white flex items-center gap-2"><ScanLine className="w-5 h-5"/> Quét mã vạch</h3>
                         <button onClick={() => setIsScanning(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>
                    <div className="p-4">
                        <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border border-zinc-800"></div>
                        <p className="text-center text-zinc-500 text-sm mt-4">Di chuyển camera đến mã vạch sản phẩm</p>
                    </div>
                </div>
            </div>
        )}

        {showPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                     
                     <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/50">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5"/> {completedOrder ? 'Thanh toán hoàn tất' : 'Thanh toán'}</h3>
                        {!completedOrder && <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>}
                     </div>
                     
                     {completedOrder ? (
                        <div className="p-8 flex flex-col items-center justify-center space-y-6 text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Đã lưu hóa đơn!</h2>
                                <p className="text-zinc-400 mt-2">Mã đơn: <span className="text-white font-mono font-bold">{completedOrder.id}</span></p>
                            </div>
                            <div className="w-full bg-zinc-800/50 p-4 rounded-xl border border-zinc-800">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-zinc-400">Khách hàng</span>
                                    <span className="text-white font-bold">{completedOrder.customerName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Tổng tiền</span>
                                    <span className="text-green-500 font-bold">{formatCurrency(completedOrder.total)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col w-full gap-3">
                                <button 
                                    onClick={handleShareZalo} 
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    {copiedZalo ? <CheckCircle className="w-5 h-5"/> : <Share2 className="w-5 h-5" />}
                                    {copiedZalo ? "Đã copy, đang mở Zalo..." : "Gửi hóa đơn Zalo"}
                                </button>
                                
                                <div className="flex gap-3 w-full">
                                    <button onClick={handlePrintReceipt} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                        <Printer className="w-5 h-5" /> In Hóa Đơn
                                    </button>
                                    <button onClick={handleFinishTransaction} className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                        Đơn Mới <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                     ) : (
                        <>
                            <div className="flex bg-black p-1 m-4 rounded-lg">
                                <button 
                                    onClick={() => setPaymentMethod('cash')} 
                                    className={`flex-1 py-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 ${paymentMethod === 'cash' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Banknote className="w-4 h-4" /> Tiền mặt
                                </button>
                                <button 
                                    onClick={() => setPaymentMethod('transfer')} 
                                    className={`flex-1 py-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 ${paymentMethod === 'transfer' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Wallet className="w-4 h-4" /> Chuyển khoản
                                </button>
                            </div>

                            <div className="p-6 pt-0 flex-1 overflow-y-auto">
                                <div className="text-center mb-6">
                                    <p className="text-zinc-400 text-sm">Tổng phải thu</p>
                                    <p className="text-4xl font-bold text-white mt-1">{formatCurrency(subTotal)}</p>
                                </div>

                                {paymentMethod === 'cash' && (
                                    <div className="space-y-6">
                                        <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-zinc-400">Khách đưa (VNĐ)</label>
                                                <input 
                                                    autoFocus
                                                    type="number" 
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-2xl font-bold text-white focus:border-green-500 focus:outline-none text-right"
                                                    value={cashGiven || ''}
                                                    onChange={(e) => setCashGiven(Number(e.target.value))}
                                                    placeholder="0"
                                                />
                                                <div className="flex gap-2 justify-end flex-wrap">
                                                    <button onClick={() => setCashGiven(subTotal)} className="bg-zinc-800 text-xs px-2 py-1 rounded text-white hover:bg-zinc-700 border border-zinc-700">Đủ tiền</button>
                                                    {[100000, 200000, 500000].map(amt => (
                                                        <button key={amt} onClick={() => setCashGiven(amt)} className="bg-zinc-800 text-xs px-2 py-1 rounded text-white hover:bg-zinc-700 border border-zinc-700">
                                                            {(amt/1000)}k
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="border-t border-zinc-800 pt-4 flex justify-between items-end">
                                                <span className="text-zinc-400 font-bold">Tiền thừa trả khách</span>
                                                <span className={`text-2xl font-bold ${changeDue < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {formatCurrency(changeDue)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'transfer' && (
                                    <div className="text-center space-y-4">
                                        <div className="bg-white p-4 rounded-xl inline-block shadow-lg relative flex items-center justify-center">
                                            <img src={vietQrUrl} alt="VietQR" className="w-56 h-56 object-contain" />
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-3 text-left space-y-1 text-xs border border-zinc-800">
                                            <div className="flex justify-between"><span className="text-zinc-500">Nội dung CK:</span> <span className="font-mono text-yellow-500 font-bold">{pendingOrderId}</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-zinc-800 bg-black/50">
                                <button 
                                    onClick={confirmPayment} 
                                    disabled={loading || (paymentMethod === 'cash' && cashGiven < subTotal)}
                                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><CheckCircle className="w-5 h-5"/> Xác nhận thanh toán</>}
                                </button>
                            </div>
                        </>
                     )}
                </div>
            </div>
        )}
    </div>
  );
});

export default PosTab;
