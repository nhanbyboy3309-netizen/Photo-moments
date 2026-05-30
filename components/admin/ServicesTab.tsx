
import React, { useState, useEffect, memo } from 'react';
import { Plus, Edit3, Trash2, Save, X, Loader2, Image as ImageIcon, Search, LayoutGrid, List, PackageOpen, UploadCloud, DollarSign, Tag, Camera, Ruler, Info, Layers } from 'lucide-react';
import { Product } from '../../types';
import { getProducts, saveProduct, deleteProduct, uploadFile } from '../../services/mockBackend';
import { formatCurrency } from '../../utils/adminHelpers';

type ProductType = 'physical' | 'service';

const PHOTO_SIZES = [
    { label: '3x4 cm (Chuẩn hồ sơ)', value: '3x4' },
    { label: '4x6 cm (Passport/Visa)', value: '4x6' },
    { label: '3.5x4.5 cm (Quốc tế)', value: '3.5x4.5' },
    { label: '5x5 cm (Visa Mỹ)', value: '5x5' },
    { label: 'Kích thước khác', value: 'custom' }
];

const ServicesTab = memo(() => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ name: '', description: '', price: 0, extraPrice: 0, costPrice: 0, imageUrl: '', type: 'physical' });
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [activeType, setActiveType] = useState<ProductType>('physical');
  const [selectedSize, setSelectedSize] = useState<string>('');

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  };

  const handleEdit = (p: Product) => { 
      setCurrentProduct(p); 
      if (!p.type) {
          setCurrentProduct({...p, type: 'physical'});
      }
      // Try to detect size from name for UI consistency
      const foundSize = PHOTO_SIZES.find(s => p.name.includes(s.value));
      setSelectedSize(foundSize ? foundSize.value : 'custom');
      
      setIsEditing(true); 
  };

  const handleAddNew = () => {
    const typePrefix = activeType === 'service' ? 'SVC' : 'SP';
    const newId = `${typePrefix}${Date.now().toString().slice(-6)}`;
    setCurrentProduct({ 
        id: newId, 
        name: activeType === 'service' ? 'Ảnh thẻ 3x4 (Set 4 ảnh)' : '', 
        description: activeType === 'service' ? 'Bao gồm chụp, chỉnh sửa da, thay phông nền và in 4 ảnh lấy ngay.' : '', 
        price: 0,
        extraPrice: 0, // Default extra price
        costPrice: 0, 
        stock: 0, 
        imageUrl: '',
        type: activeType
    });
    setSelectedSize(activeType === 'service' ? '3x4' : '');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
      if (confirm("Bạn có chắc muốn xóa mục này?")) {
          await deleteProduct(id);
          loadProducts();
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return alert("Ảnh quá lớn (< 5MB)");
      
      setUploadingImg(true);
      try {
          const url = await uploadFile(file);
          if (url) {
              setCurrentProduct(prev => ({...prev, imageUrl: url}));
          }
      } catch (e: any) { 
          console.error(e); 
          alert("Lỗi tải ảnh: " + (e.message || e)); 
      } finally { 
          setUploadingImg(false); 
      }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const size = e.target.value;
      setSelectedSize(size);
      if (size !== 'custom') {
          // Auto update name based on size
          const sizeLabel = PHOTO_SIZES.find(s => s.value === size)?.value;
          setCurrentProduct(prev => ({
              ...prev,
              name: `Ảnh thẻ ${sizeLabel} (Set 4 ảnh)`
          }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentProduct.name || !currentProduct.id) return alert("Thiếu thông tin bắt buộc");
      
      const productToSave = {
          ...currentProduct,
          type: currentProduct.type || activeType,
          stock: activeType === 'service' ? 9999 : (currentProduct.stock || 0)
      } as Product;

      setSaving(true);
      try {
          await saveProduct(productToSave);
          setIsEditing(false);
          loadProducts();
      } catch(e) { alert("Lỗi khi lưu"); } finally { setSaving(false); }
  };

  const filteredProducts = products.filter(p => {
      const typeMatch = (p.type || 'physical') === activeType;
      const searchMatch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
      return typeMatch && searchMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-bold text-white shrink-0">Quản lý Dịch vụ & Kho</h2>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Tìm kiếm..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}><List className="w-4 h-4" /></button>
                </div>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800">
            <button 
                onClick={() => setActiveType('physical')}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeType === 'physical' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
                <PackageOpen className="w-4 h-4" /> Sản Phẩm (Kho)
            </button>
            <button 
                onClick={() => setActiveType('service')}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeType === 'service' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
                <Camera className="w-4 h-4" /> Dịch Vụ (Chụp Ảnh)
            </button>
            <div className="flex-1 flex justify-end pb-2">
                 <button onClick={handleAddNew} className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 shrink-0 text-sm">
                    <Plus className="w-4 h-4" /> {activeType === 'physical' ? 'Thêm Sản Phẩm' : 'Thêm Gói Chụp'}
                </button>
            </div>
        </div>

        {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500"/></div> : (
            viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map(p => (
                        <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-600 transition-colors flex flex-col">
                            <div className="aspect-video bg-black relative">
                                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon className="w-10 h-10"/></div>}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(p)} className="bg-black/70 text-white p-2 rounded hover:bg-black"><Edit3 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(p.id)} className="bg-red-600/90 text-white p-2 rounded hover:bg-red-700"><Trash2 className="w-4 h-4"/></button>
                                </div>
                                {activeType === 'physical' && (p.stock || 0) <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-red-500 font-black border-2 border-red-500 px-2 py-1 rounded -rotate-12">HẾT HÀNG</span></div>}
                                {activeType === 'service' && <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest border border-blue-500/30">Service</div>}
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{p.name}</h3>
                                <p className="text-zinc-400 text-sm line-clamp-2 h-10 mb-4">{p.description}</p>
                                <div className="mt-auto flex justify-between items-end border-t border-zinc-800 pt-3">
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Giá bán</p>
                                        <p className="text-green-500 font-bold text-lg">{formatCurrency(p.price)}</p>
                                    </div>
                                    <div className="text-right">
                                        {activeType === 'physical' ? (
                                            <>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Tồn kho</p>
                                                <p className="text-white font-mono">{p.stock || 0}</p>
                                            </>
                                        ) : (
                                            <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">Gói 4 ảnh</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900 text-zinc-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4 w-20">Ảnh</th>
                                <th className="p-4">Mã</th>
                                <th className="p-4">Tên</th>
                                <th className="p-4 text-right">Giá</th>
                                {activeType === 'physical' ? <th className="p-4 text-right">Tồn kho</th> : <th className="p-4 text-right">Loại</th>}
                                <th className="p-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredProducts.map(p => (
                                <tr key={p.id}>
                                    <td className="p-4"><div className="w-12 h-12 bg-black rounded border border-zinc-700 overflow-hidden">{p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover"/>}</div></td>
                                    <td className="p-4 font-mono text-zinc-400">{p.id}</td>
                                    <td className="p-4 font-bold text-white">{p.name}</td>
                                    <td className="p-4 text-right text-green-500 font-bold">{formatCurrency(p.price)}</td>
                                    {activeType === 'physical' ? (
                                        <td className="p-4 text-right font-mono">{p.stock}</td>
                                    ) : (
                                        <td className="p-4 text-right font-mono text-blue-400">SERVICE</td>
                                    )}
                                    <td className="p-4 text-right"><button onClick={() => handleEdit(p)} className="text-zinc-400 hover:text-white p-2"><Edit3 className="w-4 h-4"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        )}

        {isEditing && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-sm">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-5xl max-h-[95vh] md:h-[80vh] flex flex-col md:flex-row shadow-2xl relative overflow-hidden">
                    
                    {/* LEFT: IMAGE UPLOAD */}
                    <div className="w-full md:w-2/5 bg-black p-4 md:p-6 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col items-center justify-center relative group shrink-0">
                        <div className="w-full aspect-square max-w-[150px] md:max-w-[300px] rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center overflow-hidden relative bg-zinc-900/50 hover:border-zinc-500 transition-colors">
                            {currentProduct.imageUrl ? (
                                <>
                                    <img src={currentProduct.imageUrl} className="w-full h-full object-contain" alt="" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                        <p className="text-white font-bold text-sm">Nhấn để thay đổi</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    {uploadingImg ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto"/> : <UploadCloud className="w-10 h-10 text-zinc-600 mx-auto mb-2"/>}
                                    <p className="text-zinc-500 text-xs">Tải ảnh minh họa</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-4 uppercase tracking-widest text-center">Hỗ trợ JPG, PNG, WEBP (Max 5MB)</p>
                    </div>

                    {/* RIGHT: FORM */}
                    <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden min-h-0">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 shrink-0">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                {currentProduct.name ? 'Chỉnh sửa' : 'Thêm mới'} {activeType === 'physical' ? 'Sản Phẩm' : 'Gói Dịch Vụ'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 text-white transition-colors"><X className="w-5 h-5"/></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><Tag className="w-3 h-3"/> Mã (SKU)</label>
                                    <input required type="text" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white font-mono focus:border-white focus:outline-none" value={currentProduct.id} onChange={e => setCurrentProduct({...currentProduct, id: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><PackageOpen className="w-3 h-3"/> Tên hiển thị</label>
                                    <input required type="text" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-white focus:outline-none" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} placeholder={activeType === 'physical' ? "Khung ảnh A4" : "Chụp ảnh thẻ lấy ngay"} />
                                </div>
                            </div>

                            {activeType === 'service' ? (
                                <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl space-y-4">
                                    <h4 className="text-blue-400 text-xs font-bold uppercase flex items-center gap-2"><Ruler className="w-4 h-4"/> Tùy chọn dịch vụ chụp ảnh</h4>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-bold text-zinc-400">Kích thước ảnh</label>
                                            <select 
                                                className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm"
                                                value={selectedSize}
                                                onChange={handleSizeChange}
                                            >
                                                <option value="" disabled>-- Chọn kích thước --</option>
                                                {PHOTO_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400">Giá trọn gói (Set 4 ảnh)</label>
                                            <div className="relative">
                                                <input 
                                                    required type="number" 
                                                    className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-green-500 font-bold focus:border-green-500 outline-none pr-12 text-lg" 
                                                    value={currentProduct.price} 
                                                    onChange={e => setCurrentProduct({...currentProduct, price: parseInt(e.target.value)})} 
                                                    placeholder="25000" 
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold">VNĐ</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400 flex items-center gap-1"><Layers className="w-3 h-3"/> Giá 1 ảnh thêm</label>
                                            <div className="relative">
                                                <input 
                                                    required type="number" 
                                                    className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-blue-400 font-bold focus:border-blue-500 outline-none pr-12 text-lg" 
                                                    value={currentProduct.extraPrice} 
                                                    onChange={e => setCurrentProduct({...currentProduct, extraPrice: parseInt(e.target.value)})} 
                                                    placeholder="5000" 
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold">VNĐ</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 flex items-center gap-1"><Info className="w-3 h-3"/> Ví dụ: Khách rửa 5 ảnh = Giá trọn gói (4 ảnh) + Giá 1 ảnh thêm.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><DollarSign className="w-3 h-3"/> Giá bán (VNĐ)</label>
                                        <input required type="number" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-green-500 font-bold focus:border-green-500 focus:outline-none" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseInt(e.target.value)})} placeholder="0" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Tồn kho</label>
                                        <input type="number" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-white focus:outline-none" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} placeholder="0" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Mô tả chi tiết</label>
                                <textarea rows={4} className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-white focus:outline-none text-sm leading-relaxed" value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} placeholder="Thông tin chi tiết..." />
                            </div>
                        </form>

                        <div className="p-6 border-t border-zinc-800 bg-zinc-900 shrink-0 flex gap-3">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors">Hủy bỏ</button>
                            <button onClick={handleSubmit} disabled={saving} className="flex-[2] bg-white text-black hover:bg-zinc-200 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-5 h-5"/> Lưu {activeType === 'physical' ? 'Sản phẩm' : 'Dịch vụ'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
});

export default ServicesTab;
