
import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Check, Camera, PackageOpen, ArrowRight, X, Loader2, UploadCloud, Monitor, Minus, Info } from 'lucide-react';
import { Product, CartItem } from '../types';
import { getProducts, uploadFile } from '../services/mockBackend';
import { formatCurrency } from '../utils/adminHelpers';
import { Link, useNavigate } from 'react-router-dom';

const Services: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Service Workflow State
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [photoQuantity, setPhotoQuantity] = useState(4); // Default minimum 4 photos

  useEffect(() => {
    loadData();
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, []);

  const loadData = async () => {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
  };

  const updateCartCount = () => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(total);
  };

  const handleAddToCart = (product: Product, quantity: number = 1, finalPrice?: number, customName?: string) => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Logic cho Dịch vụ: Mỗi lần thêm là một mục riêng biệt vì giá có thể tùy chỉnh theo số lượng ảnh
    if (product.type === 'service') {
        const serviceItem: CartItem = {
            ...product,
            quantity: 1, // Luôn là 1 gói
            price: finalPrice || product.price, // Giá đã tính toán (Base + Extra)
            name: customName || product.name,
            // Lưu metadata số lượng ảnh thực tế vào description hoặc field riêng để tham khảo
            description: `${product.description} | Tổng số ảnh: ${quantity}` 
        };
        cart.push(serviceItem);
    } else {
        // Logic cho Sản phẩm vật lý: Cộng dồn số lượng
        const existingIdx = cart.findIndex(i => i.id === product.id && i.type !== 'service'); 
        if (existingIdx !== -1) {
            cart[existingIdx].quantity += quantity;
        } else {
            cart.push({ ...product, quantity });
        }
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    // Reset Service Flow
    setSelectedService(null);
    setPhotoQuantity(4);
  };

  const handleServiceSelect = (service: Product) => {
      setSelectedService(service);
      setPhotoQuantity(4); // Reset về tối thiểu
  };

  const calculateServicePrice = (product: Product, qty: number) => {
      const basePrice = product.price; // Giá cho 4 ảnh đầu
      const extraPrice = product.extraPrice || 0; // Giá cho mỗi ảnh thêm
      const extraQty = Math.max(0, qty - 4);
      return basePrice + (extraQty * extraPrice);
  };

  const handleServiceSubmit = () => {
      if (selectedService) {
          const finalPrice = calculateServicePrice(selectedService, photoQuantity);
          const customName = `${selectedService.name} (${photoQuantity} ảnh)`;
          handleAddToCart(selectedService, photoQuantity, finalPrice, customName);
          navigate('/cart');
      }
  };

  const filteredItems = products.filter(p => {
      if (activeTab === 'services') return p.type === 'service';
      return p.type !== 'service';
  });

  return (
    <div className="flex-1 p-4 lg:p-10 max-w-7xl mx-auto w-full relative min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dịch vụ & Sản phẩm</h1>
          <p className="text-zinc-400 mt-2">Chọn gói chụp ảnh hoặc mua phụ kiện.</p>
        </div>
        
        {/* Tabs */}
        <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex gap-1">
            <button 
                onClick={() => setActiveTab('services')}
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'services' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}
            >
                <Camera className="w-4 h-4" /> Gói Chụp Ảnh
            </button>
            <button 
                onClick={() => setActiveTab('products')}
                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'products' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-white'}`}
            >
                <PackageOpen className="w-4 h-4" /> Khung & Phụ kiện
            </button>
        </div>
      </div>

      {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-600"/></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(product => (
              <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col hover:border-zinc-600 transition-all group shadow-lg">
                <div className="aspect-[4/3] bg-black overflow-hidden relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
                  )}
                  
                  {/* Service Badge */}
                  {product.type === 'service' && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                          Dịch vụ
                      </div>
                  )}
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{product.name}</h3>
                  <p className="text-zinc-400 text-xs mb-4 flex-1 line-clamp-2 leading-relaxed">{product.description}</p>
                  
                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-zinc-800">
                    <div>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase">{product.type === 'service' ? 'Giá cơ bản (4 ảnh)' : 'Giá bán'}</p>
                        <span className="text-xl font-bold text-white">{formatCurrency(product.price)}</span>
                    </div>
                    {product.type === 'service' ? (
                        <button 
                            onClick={() => handleServiceSelect(product)}
                            className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <Camera className="w-4 h-4" /> Chọn gói
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleAddToCart(product)}
                            className="bg-zinc-800 text-white border border-zinc-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Thêm
                        </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* SERVICE CONFIGURATION MODAL */}
      {selectedService && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                      <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <Monitor className="w-5 h-5 text-blue-500"/> Tùy chọn dịch vụ
                          </h3>
                          <p className="text-zinc-500 text-xs mt-1">{selectedService.name}</p>
                      </div>
                      <button onClick={() => setSelectedService(null)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"><X className="w-5 h-5 text-white"/></button>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 overflow-y-auto">
                      <div className="space-y-6 animate-slide-up">
                          
                          <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3">
                              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                              <div className="text-sm text-blue-200 space-y-1">
                                  <p>• Giá cơ bản: <strong>{formatCurrency(selectedService.price)}</strong> (cho 4 ảnh).</p>
                                  {selectedService.extraPrice && selectedService.extraPrice > 0 && (
                                      <p>• Phụ thu: <strong>{formatCurrency(selectedService.extraPrice)}</strong> / mỗi ảnh thêm.</p>
                                  )}
                              </div>
                          </div>

                          <div className="space-y-3">
                              <label className="text-sm font-bold text-zinc-400 uppercase">Số lượng ảnh in/chụp</label>
                              <div className="flex items-center justify-between bg-black p-2 rounded-2xl border border-zinc-800">
                                  <button 
                                    onClick={() => setPhotoQuantity(Math.max(4, photoQuantity - 1))} 
                                    className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-white transition-colors disabled:opacity-50"
                                    disabled={photoQuantity <= 4}
                                  >
                                      <Minus className="w-5 h-5"/>
                                  </button>
                                  <div className="text-center">
                                      <span className="text-3xl font-bold text-white block">{photoQuantity}</span>
                                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Ảnh (Min: 4)</span>
                                  </div>
                                  <button onClick={() => setPhotoQuantity(photoQuantity + 1)} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-white transition-colors"><Plus className="w-5 h-5"/></button>
                              </div>
                          </div>

                          <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                              <span className="text-zinc-400 text-sm">Tổng cộng</span>
                              <span className="text-2xl font-bold text-green-500">
                                  {formatCurrency(calculateServicePrice(selectedService, photoQuantity))}
                              </span>
                          </div>

                          <button onClick={handleServiceSubmit} className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-xl">
                              Thêm vào giỏ hàng <ArrowRight className="w-5 h-5"/>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <Link to="/cart" className="fixed bottom-8 right-8 bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-500 transition-transform hover:scale-110 z-50 flex items-center justify-center ring-4 ring-black">
           <ShoppingCart className="w-6 h-6" />
           <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black animate-bounce">
             {cartCount}
           </span>
        </Link>
      )}
    </div>
  );
};

export default Services;
