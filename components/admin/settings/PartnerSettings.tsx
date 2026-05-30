
import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit3, X, Save, Loader2 } from 'lucide-react';
import { Partner } from '../../../types';
import { getPartners, createPartner, updatePartner, deletePartner } from '../../../services/mockBackend';

const PartnerSettings: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: ''
  });
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isUpdatingPartner, setIsUpdatingPartner] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
      setLoadingPartners(true);
      const data = await getPartners();
      setPartners(data);
      setLoadingPartners(false);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCreatingPartner(true);
      try {
          const code = `PT${Date.now().toString().slice(-5)}`;
          await createPartner({ ...newPartner, code });
          setNewPartner({ name: '', businessName: '', phone: '', email: '' });
          loadPartners();
          alert("Tạo đối tác thành công!");
      } catch (e) {
          console.error(e);
          alert("Lỗi khi tạo đối tác.");
      } finally {
          setIsCreatingPartner(false);
      }
  };

  const handleSaveEditPartner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPartner) return;
      setIsUpdatingPartner(true);
      try {
          await updatePartner(editingPartner.id, editingPartner);
          setEditingPartner(null);
          loadPartners();
          alert("Cập nhật thông tin đối tác thành công!");
      } catch (e) {
          console.error(e);
          alert("Lỗi khi cập nhật đối tác.");
      } finally {
          setIsUpdatingPartner(false);
      }
  };

  const handleDeletePartner = async (id: number) => {
      if(window.confirm("Bạn có chắc muốn xóa đối tác này?")) {
          await deletePartner(id);
          loadPartners();
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Quản lý Đối tác</h2>
                <p className="text-zinc-400 text-sm">Tạo mã tải ảnh miễn phí cho đối tác.</p>
            </div>
        </div>

        {/* Create Form */}
        <div className="bg-black/30 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /> Thêm đối tác mới
            </h3>
            <form onSubmit={handleCreatePartner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Mã Đối Tác (Tự động)</label>
                    <input type="text" disabled placeholder="PT000..." className="w-full bg-zinc-900/50 border border-zinc-700 rounded px-3 py-2 text-zinc-500 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Tên Đối Tác *</label>
                    <input required type="text" placeholder="Nguyễn Văn A" className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none" 
                        value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Tên Doanh Nghiệp</label>
                    <input type="text" placeholder="Studio ABC" className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none" 
                        value={newPartner.businessName} onChange={e => setNewPartner({...newPartner, businessName: e.target.value})}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Số Điện Thoại</label>
                    <input type="tel" placeholder="0909..." className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none" 
                        value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})}
                    />
                </div>
                <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-zinc-500">Email Liên Hệ</label>
                    <input type="email" placeholder="partner@example.com" className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none" 
                        value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})}
                    />
                </div>
                <div className="md:col-span-2 pt-2">
                    <button disabled={isCreatingPartner} type="submit" className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors w-full md:w-auto">
                        {isCreatingPartner ? <Loader2 className="w-4 h-4 animate-spin inline mr-2"/> : 'Tạo Mã Đối Tác'}
                    </button>
                </div>
            </form>
        </div>

        {/* List */}
        <div className="space-y-2">
            <h3 className="font-bold text-zinc-400 text-sm uppercase">Danh sách đối tác ({partners.length})</h3>
            {loadingPartners ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
            ) : partners.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">Chưa có đối tác nào.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50">
                            <tr>
                                <th className="p-3">Mã</th>
                                <th className="p-3">Tên</th>
                                <th className="p-3">Doanh Nghiệp</th>
                                <th className="p-3">Liên Hệ</th>
                                <th className="p-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-sm">
                            {partners.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-900/30 group">
                                    <td className="p-3 font-mono text-white font-bold">{p.code}</td>
                                    <td className="p-3 text-zinc-300 group-hover:text-white transition-colors cursor-pointer" onClick={() => setEditingPartner(p)}>{p.name}</td>
                                    <td className="p-3 text-zinc-400">{p.businessName || '-'}</td>
                                    <td className="p-3 text-zinc-400">
                                        <div className="flex flex-col text-xs">
                                            <span>{p.phone}</span>
                                            <span>{p.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingPartner(p)} className="text-zinc-500 hover:text-white p-2" title="Chỉnh sửa">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePartner(p.id)} className="text-zinc-500 hover:text-red-500 p-2" title="Xóa">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Modal */}
        {editingPartner && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5"/> Chỉnh sửa Đối tác</h3>
                        <button onClick={() => setEditingPartner(null)} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSaveEditPartner} className="p-6 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Mã Đối Tác</label>
                            <input 
                                type="text" 
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none font-mono"
                                value={editingPartner.code}
                                onChange={(e) => setEditingPartner(prev => prev ? {...prev, code: e.target.value.toUpperCase()} : null)}
                            />
                            <p className="text-[10px] text-yellow-600/80 mt-1">Lưu ý: Thay đổi mã đối tác có thể ảnh hưởng đến lịch sử tải ảnh.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500 uppercase font-bold">Tên Đối Tác</label>
                                <input 
                                    required type="text" 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                    value={editingPartner.name}
                                    onChange={(e) => setEditingPartner(prev => prev ? {...prev, name: e.target.value} : null)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500 uppercase font-bold">Doanh Nghiệp</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                    value={editingPartner.businessName}
                                    onChange={(e) => setEditingPartner(prev => prev ? {...prev, businessName: e.target.value} : null)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500 uppercase font-bold">Số điện thoại</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                    value={editingPartner.phone}
                                    onChange={(e) => setEditingPartner(prev => prev ? {...prev, phone: e.target.value} : null)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500 uppercase font-bold">Email</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                    value={editingPartner.email}
                                    onChange={(e) => setEditingPartner(prev => prev ? {...prev, email: e.target.value} : null)}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setEditingPartner(null)} className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors">
                                Hủy
                            </button>
                            <button type="submit" disabled={isUpdatingPartner} className="flex-1 bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                                {isUpdatingPartner ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4"/> Lưu thay đổi</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default PartnerSettings;
