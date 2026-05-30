
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw, CheckCircle, Clock, CreditCard, Image as ImageIcon, 
  ShoppingBag, Search, Loader2, Check, ExternalLink, Bell, BellOff, X, User, Phone, Mail, FileText, Download, Eye
} from 'lucide-react';
import { Photo, Order } from '../../types';
import { getPhotos, getOrders, updatePhotoStatus, updateOrderStatus, getOrderById, getPhotoById } from '../../services/mockBackend';
import { formatCurrency } from '../../utils/adminHelpers';

interface TransactionItem {
  id: string;
  type: 'photo' | 'order';
  customer: string;
  contact: string;
  amount: number;
  status: string;
  createdAt: string;
  details?: string;
}

const RecentTransactionsTab: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<TransactionItem | null>(null);
  const [fullDetail, setFullDetail] = useState<{ photo?: Photo, order?: Order } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [photoData, orderData] = await Promise.all([
        getPhotos(),
        getOrders()
      ]);
      setPhotos(photoData);
      setOrders(orderData);
    } catch (error) {
      console.error("Failed to refresh transactions", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling logic
  useEffect(() => {
    loadData();
    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadData();
      }, 5000); 
    }
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleConfirmPayment = async (id: string, type: 'photo' | 'order') => {
    if (!window.confirm(`Xác nhận thanh toán cho giao dịch ${id}?`)) return;
    
    setProcessingId(id);
    try {
      if (type === 'photo') {
        await updatePhotoStatus(id, 'paid');
      } else {
        await updateOrderStatus(id, 'paid');
      }
      await loadData();
      // If modal is open, update its local state
      if (selectedItem && selectedItem.id === id) {
          setSelectedItem(prev => prev ? { ...prev, status: 'paid' } : null);
      }
    } catch (error) {
      alert("Lỗi khi cập nhật trạng thái.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetail = async (item: TransactionItem) => {
    setSelectedItem(item);
    setLoadingDetail(true);
    setFullDetail(null);
    try {
        if (item.type === 'photo') {
            const data = await getPhotoById(item.id);
            if (data) setFullDetail({ photo: data });
        } else {
            const data = await getOrderById(item.id);
            if (data) setFullDetail({ order: data });
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingDetail(false);
    }
  };

  const unifiedTransactions = useMemo(() => {
    const list: TransactionItem[] = [];

    photos.forEach(p => {
      list.push({
        id: p.id,
        type: 'photo',
        customer: p.customerEmail || 'Khách ẩn danh',
        contact: p.customerEmail || '---',
        amount: p.price,
        status: p.status,
        createdAt: p.createdAt,
        details: 'Mua ảnh lẻ HD'
      });
    });

    orders.forEach(o => {
      list.push({
        id: o.id,
        type: 'order',
        customer: o.customerName,
        contact: o.customerPhone || o.customerEmail,
        amount: o.total,
        status: o.status,
        createdAt: o.createdAt,
        details: `${o.items.length} sản phẩm`
      });
    });

    return list
      .filter(item => {
        const matchesSearch = item.id.toLowerCase().includes(search.toLowerCase()) || 
                            item.customer.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' ? true : item.status === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [photos, orders, search, filter]);

  const pendingCount = unifiedTransactions.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in relative flex flex-col h-full">
      {/* 🔹 Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-3 rounded-xl transition-all ${autoRefresh ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-zinc-800 text-zinc-500'}`}
              title={autoRefresh ? "Tự động cập nhật đang bật" : "Tự động cập nhật đang tắt"}
            >
              {autoRefresh ? <Bell className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
            </button>
            {autoRefresh && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-zinc-900 rounded-full"></span>}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">Giao dịch gần đây</h2>
            <p className="text-zinc-500 text-xs uppercase font-black tracking-widest">
              {autoRefresh ? "Đang theo dõi trực tiếp..." : "Cập nhật thủ công"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Tìm mã, khách hàng..."
              className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-white focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={loadData} className="p-2.5 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🔹 Filter Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900/30 w-fit rounded-xl border border-zinc-800/50 shrink-0">
        {[
          { id: 'pending', label: 'Chờ duyệt', count: pendingCount },
          { id: 'paid', label: 'Đã thanh toán', count: null },
          { id: 'all', label: 'Tất cả', count: null }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              filter === t.id ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === t.id ? 'bg-black text-white' : 'bg-red-600 text-white'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 🔹 Transactions Table Container with Vertical Scroll */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          <table className="w-full text-left text-sm border-collapse relative">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-900 text-zinc-500 uppercase font-black text-[10px] tracking-widest border-b border-zinc-800">
                <th className="p-4 bg-zinc-900">Thời gian</th>
                <th className="p-4 bg-zinc-900">Mã / Loại</th>
                <th className="p-4 bg-zinc-900">Khách hàng</th>
                <th className="p-4 text-right bg-zinc-900">Giá trị</th>
                <th className="p-4 text-center bg-zinc-900">Trạng thái</th>
                <th className="p-4 text-right bg-zinc-900">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {unifiedTransactions.map((item) => (
                <tr key={`${item.type}-${item.id}`} className={`hover:bg-white/[0.02] transition-colors group ${item.status === 'pending' ? 'bg-yellow-500/[0.02]' : ''}`}>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-zinc-500 text-[10px]">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => handleViewDetail(item)}
                      className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'photo' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {item.type === 'photo' ? <ImageIcon className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-white text-xs underline decoration-zinc-700 underline-offset-4">{item.id}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">{item.details}</span>
                      </div>
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col max-w-[150px]">
                      <span className="text-zinc-200 font-bold truncate">{item.customer}</span>
                      <span className="text-zinc-500 text-xs truncate">{item.contact}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-white font-black">{formatCurrency(item.amount)}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      item.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse' :
                      'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}>
                      {item.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {item.status === 'paid' ? 'Đã thu tiền' : 'Đang chờ'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' && (
                          <button 
                            onClick={() => handleConfirmPayment(item.id, item.type)}
                            disabled={processingId === item.id}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 transition-transform active:scale-95"
                          >
                            {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Duyệt
                          </button>
                        )}
                        <button 
                            onClick={() => handleViewDetail(item)}
                            className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {unifiedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-zinc-600">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="w-12 h-12 opacity-10" />
                      <p className="font-bold uppercase tracking-widest text-xs">Không có giao dịch nào {filter === 'pending' ? 'đang chờ' : ''}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 DETAIL POPUP MODAL */}
      {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                      <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedItem.type === 'photo' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                            {selectedItem.type === 'photo' ? <ImageIcon className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white uppercase tracking-tight">{selectedItem.type === 'photo' ? 'Chi tiết Ảnh' : 'Chi tiết Đơn hàng'}</h3>
                              <p className="text-zinc-500 text-xs font-mono">{selectedItem.id}</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => setSelectedItem(null)}
                        className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-xl transition-colors"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                      {loadingDetail ? (
                          <div className="py-20 flex flex-col items-center gap-4">
                              <Loader2 className="w-10 h-10 animate-spin text-zinc-600" />
                              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
                          </div>
                      ) : (
                          <>
                            {/* General Status Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/30 p-4 rounded-2xl border border-zinc-800 space-y-3">
                                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                        <User className="w-3 h-3" /> Thông tin khách
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-white font-bold">{selectedItem.customer}</p>
                                        <p className="text-zinc-400 text-sm flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {selectedItem.contact}</p>
                                        {fullDetail?.order?.customerPhone && <p className="text-zinc-400 text-sm flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {fullDetail.order.customerPhone}</p>}
                                    </div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl border border-zinc-800 space-y-3">
                                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                        <CreditCard className="w-3 h-3" /> Trạng thái
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-zinc-400 text-sm">Tổng cộng:</span>
                                            <span className="text-xl font-black text-white">{formatCurrency(selectedItem.amount)}</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-full justify-center ${
                                            selectedItem.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}>
                                            {selectedItem.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            {selectedItem.status === 'paid' ? 'Đã thanh toán' : 'Chờ xác nhận'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Specific Details: Photo */}
                            {fullDetail?.photo && (
                                <div className="space-y-4">
                                    <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Ảnh xem trước (Watermarked)</h4>
                                    <div className="aspect-video bg-black rounded-2xl border border-zinc-800 overflow-hidden relative group">
                                        <img src={fullDetail.photo.url} className="w-full h-full object-contain" alt="" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={fullDetail.photo.url} target="_blank" rel="noreferrer" className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                                <ExternalLink className="w-4 h-4" /> Mở ảnh gốc
                                            </a>
                                        </div>
                                    </div>
                                    {fullDetail.photo.stampCode && (
                                        <div className="bg-green-900/10 border border-green-900/20 p-3 rounded-xl flex justify-between items-center">
                                            <span className="text-zinc-400 text-xs">Mã Stamp liên kết:</span>
                                            <span className="text-green-500 font-mono font-bold">{fullDetail.photo.stampCode}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Specific Details: Order */}
                            {fullDetail?.order && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Danh sách sản phẩm</h4>
                                        <div className="space-y-2">
                                            {fullDetail.order.items.map((item, i) => (
                                                <div key={i} className="bg-black/20 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{item.name}</p>
                                                        <p className="text-zinc-500 text-[10px]">Đơn giá: {formatCurrency(item.price)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white font-bold text-sm">x{item.quantity}</p>
                                                        <p className="text-green-500 font-bold text-xs">{formatCurrency(item.price * item.quantity)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {fullDetail.order.uploadedFiles && fullDetail.order.uploadedFiles.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Tệp đính kèm ({fullDetail.order.uploadedFiles.length})</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                {fullDetail.order.uploadedFiles.map((url, i) => (
                                                    <a 
                                                        key={i} href={url} target="_blank" rel="noreferrer"
                                                        className="bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 p-3 rounded-xl flex items-center gap-3 transition-colors group"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-zinc-500 group-hover:text-blue-500 transition-colors">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-xs font-bold truncate">File_{i+1}</p>
                                                            <p className="text-zinc-500 text-[10px] uppercase">Download</p>
                                                        </div>
                                                        <Download className="w-4 h-4 text-zinc-600" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {fullDetail.order.customerAddress && fullDetail.order.customerAddress !== 'Tại quầy' && (
                                        <div className="bg-black/30 p-4 rounded-2xl border border-zinc-800 space-y-2">
                                            <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Địa chỉ nhận hàng</h4>
                                            <p className="text-zinc-300 text-sm italic">{fullDetail.order.customerAddress}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                          </>
                      )}
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="p-6 border-t border-zinc-800 bg-black/40 flex gap-3 shrink-0">
                      <button 
                        onClick={() => setSelectedItem(null)}
                        className="flex-1 bg-zinc-800 text-zinc-400 py-3 rounded-2xl font-bold hover:bg-zinc-700 transition-all uppercase text-xs tracking-widest"
                      >
                          Đóng
                      </button>
                      {selectedItem.status === 'pending' && (
                          <button 
                            onClick={() => handleConfirmPayment(selectedItem.id, selectedItem.type)}
                            disabled={processingId === selectedItem.id}
                            className="flex-[2] bg-green-600 hover:bg-green-500 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-900/20 flex items-center justify-center gap-2"
                          >
                            {processingId === selectedItem.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Xác nhận thanh toán
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RecentTransactionsTab;
