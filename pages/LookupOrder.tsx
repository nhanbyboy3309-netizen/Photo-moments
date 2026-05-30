
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Package, Calendar, User, FileText, CheckCircle, AlertCircle, Share2, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getOrderById, updateOrderStatus, checkAuth } from '../services/mockBackend';
import { Order } from '../types';
import { formatCurrency, shareToZalo } from '../utils/adminHelpers';

const LookupOrder = () => {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminConfirming, setIsAdminConfirming] = useState(false);

  useEffect(() => {
    setIsAdmin(checkAuth());
  }, []);

  // Extract search logic for reuse
  const performSearch = useCallback(async (id: string) => {
    if (!id.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
        const result = await getOrderById(id.trim());
        if (result) {
            setOrder(result);
        } else {
            setError('Không tìm thấy đơn hàng với mã này.');
        }
    } catch (e) {
        setError('Lỗi khi tra cứu. Vui lòng thử lại.');
    } finally {
        setLoading(false);
    }
  }, []);

  // Check for URL param on mount
  useEffect(() => {
      const idFromUrl = searchParams.get('id');
      if (idFromUrl) {
          setOrderId(idFromUrl);
          performSearch(idFromUrl);
      }
  }, [searchParams, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(orderId);
  };

  const handleAdminConfirmPayment = async () => {
      if (!order) return;
      setIsAdminConfirming(true);
      try {
          await updateOrderStatus(order.id, 'paid');
          setOrder({...order, status: 'paid'});
          alert("Admin: Đã xác nhận thanh toán!");
      } catch (err) {
          alert("Lỗi khi xác nhận.");
      } finally {
          setIsAdminConfirming(false);
      }
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Tra cứu đơn hàng</h1>
        <p className="text-zinc-400">Nhập mã đơn hàng hoặc hóa đơn để kiểm tra trạng thái.</p>
      </div>

      {/* Search Form */}
      <div className="max-w-xl mx-auto mb-10">
        <form onSubmit={handleSearch} className="relative group">
           <div className="absolute inset-0 bg-white/5 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
           <div className="relative flex items-center bg-zinc-900 border border-zinc-700 rounded-full p-2 pl-6 shadow-2xl focus-within:border-white transition-colors">
               <Search className="w-5 h-5 text-zinc-500" />
               <input 
                 type="text" 
                 placeholder="Nhập mã đơn hàng (Ví dụ: ORD123456)"
                 className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-zinc-600 h-12 px-4 text-lg"
                 value={orderId}
                 onChange={(e) => setOrderId(e.target.value)}
               />
               <button 
                 type="submit"
                 disabled={loading}
                 className="bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50"
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
               </button>
           </div>
        </form>
      </div>

      {/* Result Display */}
      {error && (
          <div className="text-center bg-red-500/10 border border-red-500/20 p-6 rounded-xl max-w-xl mx-auto animate-fade-in">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 font-bold">{error}</p>
          </div>
      )}

      {order && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
              <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/20">
                  <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Package className="w-5 h-5 text-zinc-500" /> 
                          Đơn hàng #{order.id}
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(order.createdAt).toLocaleString()}
                      </p>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-full font-bold uppercase text-sm flex items-center gap-2 ${
                          order.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                          {order.status === 'paid' ? <CheckCircle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                          {order.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                      </div>
                      <button 
                        onClick={() => shareToZalo(order)}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors"
                        title="Gửi hóa đơn qua Zalo"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                  </div>
              </div>

              <div className="p-6 grid md:grid-cols-2 gap-8">
                  {/* Info */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-zinc-300 border-b border-zinc-800 pb-2 mb-2">Thông tin khách hàng</h3>
                      <div className="space-y-3">
                          <div className="flex items-start gap-3">
                              <User className="w-5 h-5 text-zinc-600 mt-0.5" />
                              <div>
                                  <p className="text-white font-medium">{order.customerName}</p>
                                  <p className="text-zinc-500 text-sm">{order.customerPhone}</p>
                                  <p className="text-zinc-500 text-sm">{order.customerEmail}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <FileText className="w-5 h-5 text-zinc-600 mt-0.5" />
                              <div>
                                  <p className="text-zinc-400 text-sm italic">{order.customerAddress || "Tại quầy"}</p>
                              </div>
                          </div>
                      </div>

                      {isAdmin && order.status !== 'paid' && (
                        <div className="pt-6 border-t border-zinc-800 mt-6">
                            <button 
                                onClick={handleAdminConfirmPayment}
                                disabled={isAdminConfirming}
                                className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isAdminConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                Admin: Xác nhận đã thanh toán
                            </button>
                        </div>
                      )}
                  </div>

                  {/* Items */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-zinc-300 border-b border-zinc-800 pb-2 mb-2">Chi tiết đơn hàng</h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                          {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                                  <div>
                                      <p className="text-white font-medium text-sm">{item.name}</p>
                                      <p className="text-zinc-500 text-xs">x{item.quantity}</p>
                                  </div>
                                  <p className="text-white font-mono text-sm">{formatCurrency(item.price * item.quantity)}</p>
                              </div>
                          ))}
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                          <span className="text-zinc-400">Tổng tiền</span>
                          <span className="text-2xl font-bold text-green-500">{formatCurrency(order.total)}</span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LookupOrder;
