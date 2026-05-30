
import React, { useState } from 'react';
import { Menu, Plus, Trash2, Edit3, MoveUp, MoveDown, Eye, EyeOff, Save, Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { SiteSettings, NavItem } from '../../../types';

interface NavigationSettingsProps {
  settings: SiteSettings;
  updateSettings: (updates: Partial<SiteSettings>) => void;
  onSave: () => void;
  saving: boolean;
}

const NavigationSettings: React.FC<NavigationSettingsProps> = ({ settings, updateSettings, onSave, saving }) => {
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<NavItem>>({
    label: '',
    path: '/',
    isExternal: false,
    isVisible: true
  });

  const handleAddItem = () => {
    if (!newItem.label || !newItem.path) return alert("Vui lòng nhập tên và đường dẫn");
    
    const item: NavItem = {
      id: Date.now().toString(),
      label: newItem.label,
      path: newItem.path,
      isExternal: newItem.isExternal || false,
      isVisible: newItem.isVisible !== false,
      iconName: newItem.iconName
    };

    updateSettings({ navigationItems: [...settings.navigationItems, item] });
    setNewItem({ label: '', path: '/', isExternal: false, isVisible: true });
  };

  const handleRemoveItem = (id: string) => {
    if (confirm("Xóa mục menu này?")) {
      updateSettings({ navigationItems: settings.navigationItems.filter(i => i.id !== id) });
    }
  };

  const handleToggleVisibility = (id: string) => {
    updateSettings({
      navigationItems: settings.navigationItems.map(i => 
        i.id === id ? { ...i, isVisible: !i.isVisible } : i
      )
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const items = [...settings.navigationItems];
    if (direction === 'up' && index > 0) {
      [items[index], items[index - 1]] = [items[index - 1], items[index]];
    } else if (direction === 'down' && index < items.length - 1) {
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    updateSettings({ navigationItems: items });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    updateSettings({
      navigationItems: settings.navigationItems.map(i => 
        i.id === editingItem.id ? editingItem : i
      )
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
          <Menu className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Quản lý Menu</h2>
          <p className="text-zinc-400 text-sm">Tùy chỉnh thanh điều hướng của website.</p>
        </div>
      </div>

      {/* Thêm mới */}
      <div className="bg-black/30 p-5 rounded-xl border border-zinc-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Thêm Menu mới</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input 
            type="text" placeholder="Tên hiển thị" 
            className="bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white"
            value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})}
          />
          <input 
            type="text" placeholder="Đường dẫn (VD: /print)" 
            className="bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white"
            value={newItem.path} onChange={e => setNewItem({...newItem, path: e.target.value})}
          />
          <button onClick={handleAddItem} className="bg-white text-black font-bold rounded py-2 text-sm hover:bg-zinc-200">
            Thêm vào danh sách
          </button>
        </div>
      </div>

      {/* Danh sách */}
      <div className="space-y-2">
        {settings.navigationItems.map((item, idx) => (
          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${item.isVisible ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-950 border-zinc-900 opacity-60'}`}>
            <div className="flex flex-col gap-1">
              <button onClick={() => handleMove(idx, 'up')} className="text-zinc-600 hover:text-white disabled:opacity-0" disabled={idx === 0}><MoveUp className="w-3 h-3"/></button>
              <button onClick={() => handleMove(idx, 'down')} className="text-zinc-600 hover:text-white disabled:opacity-0" disabled={idx === settings.navigationItems.length - 1}><MoveDown className="w-3 h-3"/></button>
            </div>
            
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate">{item.label}</span>
                  {item.isExternal && <ExternalLink className="w-3 h-3 text-zinc-500"/>}
               </div>
               <code className="text-[10px] text-zinc-500 font-mono">{item.path}</code>
            </div>

            <div className="flex items-center gap-1">
               <button onClick={() => handleToggleVisibility(item.id)} className="p-2 text-zinc-400 hover:text-white">
                  {item.isVisible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
               </button>
               <button onClick={() => setEditingItem(item)} className="p-2 text-zinc-400 hover:text-white">
                  <Edit3 className="w-4 h-4"/>
               </button>
               <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-zinc-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4"/>
               </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-zinc-800">
        <button onClick={onSave} disabled={saving} className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4"/> Lưu cấu hình Menu</>}
        </button>
      </div>

      {/* Modal Sửa */}
      {editingItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 space-y-4">
             <h3 className="text-lg font-bold text-white">Sửa mục Menu</h3>
             <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Tên hiển thị</label>
                  <input type="text" className="w-full bg-black border border-zinc-700 rounded p-2 text-white" value={editingItem.label} onChange={e => setEditingItem({...editingItem, label: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-bold uppercase">Đường dẫn</label>
                  <input type="text" className="w-full bg-black border border-zinc-700 rounded p-2 text-white" value={editingItem.path} onChange={e => setEditingItem({...editingItem, path: e.target.value})} />
                </div>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={editingItem.isExternal} onChange={e => setEditingItem({...editingItem, isExternal: e.target.checked})} />
                    Mở link ngoài
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={editingItem.isVisible} onChange={e => setEditingItem({...editingItem, isVisible: e.target.checked})} />
                    Hiển thị
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setEditingItem(null)} className="flex-1 bg-zinc-800 text-white rounded py-2 font-bold">Hủy</button>
                  <button type="submit" className="flex-1 bg-white text-black rounded py-2 font-bold">Cập nhật</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationSettings;
