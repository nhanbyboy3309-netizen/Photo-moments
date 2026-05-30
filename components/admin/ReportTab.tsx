
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, CreditCard, ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Check } from 'lucide-react';
import { Order } from '../../types';
import { getOrders, updateOrderStatus } from '../../services/mockBackend';
import { formatCurrency } from '../../utils/adminHelpers';

const ReportTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getOrders();
    setOrders(data);
    setLoading(false);
  };

  const handleQuickConfirm = async (id: string) => {
      setConfirmingId(id);
      try {
          await updateOrderStatus(id, 'paid');
          await loadData(); // Reload stats
      } catch (err) {
          alert("Lỗi khi xác nhận thanh toán.");
      } finally {
          setConfirmingId(null);
      }
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const now = new Date();
    let filtered = orders;

    // Time Filter
    if (timeRange === 'today') {
        filtered = orders.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
    } else if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = orders.filter(o => new Date(o.createdAt) >= weekAgo);
    } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = orders.filter(o => new Date(o.createdAt) >= monthAgo);
    }

    // Metrics
    const totalRevenue = filtered.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filtered.length;
    const paidOrders = filtered.filter(o => o.status === 'paid').length;
    const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;
    
    // Chart Data (Last 7 Days)
    const dailyRevenue: Record<string, number> = {};
    const chartLabels: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = `${d.getDate()}/${d.getMonth()+1}`;
        chartLabels.push(label);
        dailyRevenue[label] = 0;
    }

    filtered.forEach(o => {
        if (o.status === 'paid') {
            const d = new Date(o.createdAt);
            const label = `${d.getDate()}/${d.getMonth()+1}`;
            if (dailyRevenue[label] !== undefined) {
                dailyRevenue[label] += o.total;
            }
        }
    });

    return {
        totalRevenue,
        totalOrders,
        paidOrders,
        avgOrderValue,
        chartData: chartLabels.map(l => ({ label: l, value: dailyRevenue[l] })),
        filteredList: filtered.slice(0, 30) // Recent 30
    };
  }, [orders, timeRange]);

  const maxChartValue = Math.max(...stats.chartData.map(d => d.value), 1);

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6"/> Báo cáo doanh thu</h2>
                <p className="text-zinc-400 text-sm">Thống kê hiệu quả kinh doanh của cửa hàng.</p>
            </div>
            
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                {(['today', 'week', 'month', 'all'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTimeRange(t)}
                        className={`px-3 py-1.5 text-xs font-bold rounded capitalize ${timeRange === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
                    >
                        {t === 'today' ? 'Hôm nay' : t === 'week' ? 'Tuần này' : t === 'month' ? 'Tháng này' : 'Tất cả'}
                    </button>
                ))}
                <button onClick={loadData} className="px-3 py-1.5 text-zinc-500 hover:text-white border-l border-zinc-700 ml-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                </button>
            </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="w-16 h-16 text-green-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-zinc-400 text-sm font-bold uppercase mb-1">Doanh thu</p>
                    <h3 className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</h3>
                    <p className="text-green-500 text-xs mt-2 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> Đã thanh toán
                    </p>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShoppingBag className="w-16 h-16 text-blue-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-zinc-400 text-sm font-bold uppercase mb-1">Tổng đơn hàng</p>
                    <h3 className="text-3xl font-bold text-white">{stats.totalOrders}</h3>
                    <p className="text-blue-500 text-xs mt-2 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> {stats.paidOrders} đơn đã thanh toán
                    </p>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CreditCard className="w-16 h-16 text-yellow-500" />
                </div>
                <div className="relative z-10">
                    <p className="text-zinc-400 text-sm font-bold uppercase mb-1">Giá trị TB / Đơn</p>
                    <h3 className="text-3xl font-bold text-white">{formatCurrency(stats.avgOrderValue)}</h3>
                    <p className="text-zinc-500 text-xs mt-2">Tính trên đơn đã thanh toán</p>
                </div>
            </div>
        </div>

        {/* Chart Area */}
        {stats.chartData.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Biểu đồ doanh thu (7 ngày qua)</h3>
                <div className="h-64 flex items-end gap-2 md:gap-4">
                    {stats.chartData.map((d, i) => {
                        const heightPct = (d.value / maxChartValue) * 100;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                                <div className="w-full bg-zinc-800 rounded-t-lg relative h-full flex items-end overflow-hidden group-hover:bg-zinc-700 transition-colors">
                                    <div 
                                        style={{ height: `${heightPct}%` }} 
                                        className="w-full bg-green-600 opacity-80 group-hover:opacity-100 transition-all relative"
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            {formatCurrency(d.value)}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{d.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* Recent Orders List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
             <div className="p-4 border-b border-zinc-800">
                 <h3 className="font-bold text-white">Giao dịch gần đây</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm min-w-[800px]">
                     <thead className="bg-zinc-900 text-zinc-500 uppercase font-bold text-xs">
                         <tr>
                             <th className="p-4">Mã Đơn</th>
                             <th className="p-4">Khách hàng</th>
                             <th className="p-4">Ngày tạo</th>
                             <th className="p-4">PTTT</th>
                             <th className="p-4 text-right">Tổng tiền</th>
                             <th className="p-4 text-right">Trạng thái</th>
                             <th className="p-4 text-center">Xác nhận</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800">
                         {stats.filteredList.map(order => (
                             <tr key={order.id} className="hover:bg-zinc-800/50">
                                 <td className="p-4 font-mono font-bold text-white underline">
                                     <a href={`#/lookup?id=${order.id}`} target="_blank" rel="noreferrer">{order.id}</a>
                                 </td>
                                 <td className="p-4 text-zinc-300">
                                     <div className="font-bold">{order.customerName}</div>
                                     <div className="text-xs text-zinc-500">{order.customerPhone || order.customerEmail}</div>
                                 </td>
                                 <td className="p-4 text-zinc-400 text-xs">
                                     {new Date(order.createdAt).toLocaleDateString()}<br/>
                                     {new Date(order.createdAt).toLocaleTimeString()}
                                 </td>
                                 <td className="p-4 text-zinc-400 capitalize">{order.paymentMethod === 'transfer' ? 'Chuyển khoản' : order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Online'}</td>
                                 <td className="p-4 text-right font-bold text-green-500">{formatCurrency(order.total)}</td>
                                 <td className="p-4 text-right">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                         order.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                     }`}>
                                         {order.status}
                                     </span>
                                 </td>
                                 <td className="p-4 text-center">
                                     {order.status === 'pending' && (
                                         <button 
                                            onClick={() => handleQuickConfirm(order.id)}
                                            disabled={confirmingId === order.id}
                                            className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                                            title="Xác nhận đã thanh toán"
                                         >
                                             {confirmingId === order.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}
                                         </button>
                                     )}
                                 </td>
                             </tr>
                         ))}
                         {stats.filteredList.length === 0 && (
                             <tr><td colSpan={7} className="p-8 text-center text-zinc-500">Chưa có dữ liệu</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
        </div>
    </div>
  );
};

export default ReportTab;
