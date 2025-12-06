import React, { useEffect, useState } from 'react';
import { checkAuth, login, logout, generatePhotoId, savePhoto, getPhotos, updatePhotoStatus, updatePassword, getSettings, saveSettings } from '../services/mockBackend';
import { Photo, SiteSettings } from '../types';
import { Upload, LogOut, Search, QrCode, Check, Copy, RefreshCw, Loader2, Download, Settings, Lock, Edit3, Image as ImageIcon, Type } from 'lucide-react';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // Dashboard State
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'settings'>('upload');
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<Photo | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setIsAuthenticated(checkAuth());
    if (checkAuth()) {
      loadInitialData();
    }
  }, []);

  const loadInitialData = async () => {
    loadPhotos();
    const s = await getSettings();
    setSettings(s);
  };

  const loadPhotos = async () => {
    const data = await getPhotos();
    setPhotos(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(password);
    if (success) {
      setIsAuthenticated(true);
      loadInitialData();
    } else {
      alert('Invalid password (Default: admin123)');
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setPassword('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setLastUploaded(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !previewUrl || !settings) return;
    setUploading(true);

    try {
      const newId = await generatePhotoId();
      
      const newPhoto: Photo = {
        id: newId,
        url: previewUrl, 
        fileName: uploadFile.name,
        createdAt: new Date().toISOString(),
        status: 'unpaid',
        price: settings.photoPrice // Use dynamic price
      };

      await savePhoto(newPhoto);
      await loadPhotos();
      setLastUploaded(newPhoto);
      setUploadFile(null);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Photo['status']) => {
    await updatePhotoStatus(id, newStatus);
    loadPhotos();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu không khớp!");
      return;
    }
    if (newPassword.length < 4) {
      alert("Mật khẩu quá ngắn (tối thiểu 4 ký tự)!");
      return;
    }

    setIsChangingPassword(true);
    await updatePassword(newPassword);
    setIsChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    alert("Đổi mật khẩu thành công!");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    await saveSettings(settings);
    setSavingSettings(false);
    alert("Cập nhật cài đặt thành công!");
  };

  // Helper to handle Logo file upload and convert to base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && settings) {
      const file = e.target.files[0];
      // Check file size (limit to ~2MB for localStorage sake, though 5MB is total limit)
      if (file.size > 2 * 1024 * 1024) {
        alert("File ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setSettings({
            ...settings,
            logoImageUrl: reader.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-xl space-y-6 shadow-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Admin Access</h2>
            <p className="text-zinc-500 text-sm mt-1">Please authenticate to continue</p>
          </div>
          <input 
            type="password" 
            placeholder="Password"
            className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors">
            Login
          </button>
          <p className="text-xs text-zinc-600 text-center">Hint: admin123</p>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-bold tracking-tighter">Dashboard</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 bg-red-500/10 px-4 py-2 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="flex gap-6 mb-10 border-b border-zinc-800 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('upload')}
          className={`pb-4 px-2 font-medium transition-all border-b-2 text-lg whitespace-nowrap ${activeTab === 'upload' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Upload Photo
        </button>
        <button 
          onClick={() => setActiveTab('gallery')}
          className={`pb-4 px-2 font-medium transition-all border-b-2 text-lg whitespace-nowrap ${activeTab === 'gallery' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Manage Photos ({photos.length})
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-2 font-medium transition-all border-b-2 text-lg whitespace-nowrap flex items-center gap-2 ${activeTab === 'settings' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 animate-fade-in">
          <div className="space-y-6">
            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center hover:border-zinc-600 hover:bg-zinc-900/50 transition-all relative cursor-pointer group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-16 h-16 text-zinc-600 group-hover:text-white mx-auto mb-6" />
              </div>
              <p className="text-xl font-medium text-white">Click or Drag to Upload</p>
              <p className="text-zinc-500 text-sm mt-2">Supports JPG, PNG</p>
            </div>
            
            {uploadFile && (
              <div className="bg-zinc-900 p-6 rounded-xl flex items-center justify-between border border-zinc-800">
                 <span className="truncate flex-1 font-medium text-zinc-300">{uploadFile.name}</span>
                 <button 
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-white text-black px-6 py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-zinc-200 transition-colors"
                 >
                   {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Upload & Generate ID'}
                 </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {lastUploaded ? (
               <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-2xl space-y-6 animate-fade-in">
                  <div className="flex items-center gap-3 text-green-500 font-bold text-xl">
                    <Check className="w-6 h-6" /> Upload Successful
                  </div>
                  <div className="space-y-2">
                    <p className="text-zinc-400 text-sm uppercase tracking-wide">Generated ID</p>
                    <p className="text-4xl font-mono font-bold text-white tracking-widest">{lastUploaded.id}</p>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <a 
                       href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/#/view/${lastUploaded.id}`)}`}
                       download="qr.png"
                       target="_blank"
                       rel="noreferrer"
                       className="flex-1 bg-white text-black py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                    >
                      <QrCode className="w-5 h-5" /> Download QR
                    </a>
                    <button 
                       onClick={() => {
                         navigator.clipboard.writeText(`${window.location.origin}/#/view/${lastUploaded.id}`);
                         alert('Link copied!');
                       }}
                       className="flex-1 bg-black border border-zinc-700 text-white py-3 rounded-xl text-center font-bold hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-5 h-5" /> Copy Link
                    </button>
                  </div>
               </div>
            ) : previewUrl && (
              <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800 overflow-hidden animate-fade-in overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-sm uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">ID</th>
                <th className="py-4 px-6 font-medium">Preview</th>
                <th className="py-4 px-6 font-medium">Price</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {photos.map(photo => (
                <tr key={photo.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-sm font-bold text-white">{photo.id}</td>
                  <td className="py-4 px-6">
                    <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-zinc-300">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(photo.price || 50000)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      photo.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      photo.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                      'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {photo.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {photo.status !== 'paid' && (
                        <button 
                          onClick={() => handleStatusChange(photo.id, 'paid')}
                          className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                          title="Confirm Payment"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => updatePhotoStatus(photo.id, 'unpaid')}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 p-2 rounded-lg transition-colors"
                        title="Reset Status"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <div className="h-6 w-px bg-zinc-700 mx-1"></div>

                      <a 
                        href={photo.url} 
                        download={`photo-${photo.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-zinc-800 hover:bg-zinc-700 text-blue-400 p-2 rounded-lg transition-colors"
                        title="Download Photo"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      <a 
                         href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/#/view/${photo.id}`)}`}
                         download={`qr-${photo.id}.png`}
                         target="_blank"
                         rel="noreferrer"
                         className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors"
                         title="Download QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {photos.length === 0 && (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-lg">No photos found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* CONTENT SETTINGS */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
               <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                 <Edit3 className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-white">Nội dung trang chủ</h2>
                 <p className="text-zinc-400 text-sm">Chỉnh sửa thông tin, giá bán và logo.</p>
               </div>
            </div>

            {settings ? (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* LOGO SETTINGS */}
                <div className="bg-black/30 p-4 rounded-xl border border-zinc-800 space-y-4">
                  <label className="text-sm font-medium text-zinc-300 block mb-2">Logo hiển thị</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSettings({...settings, logoType: 'image'})}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border ${
                        settings.logoType === 'image' 
                        ? 'bg-white text-black border-white' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" /> Hình ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({...settings, logoType: 'text'})}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border ${
                        settings.logoType === 'text' 
                        ? 'bg-white text-black border-white' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <Type className="w-4 h-4" /> Văn bản
                    </button>
                  </div>

                  {settings.logoType === 'text' ? (
                     <div className="space-y-2">
                       <input 
                         type="text"
                         className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                         value={settings.logoText}
                         onChange={(e) => setSettings({...settings, logoText: e.target.value})}
                         placeholder="Nhập tên thương hiệu..."
                       />
                     </div>
                  ) : (
                    <div className="space-y-3">
                       {settings.logoImageUrl && (
                         <div className="bg-zinc-800 p-2 rounded-lg flex justify-center border border-zinc-700">
                           <img src={settings.logoImageUrl} alt="Logo Preview" className="max-h-24 object-contain" />
                         </div>
                       )}
                       <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                          />
                       </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Tiêu đề (Về chúng tôi)</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                    value={settings.aboutTitle}
                    onChange={(e) => setSettings({...settings, aboutTitle: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Nội dung giới thiệu</label>
                  <textarea 
                    required
                    rows={8}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white text-sm leading-relaxed"
                    value={settings.aboutContent}
                    onChange={(e) => setSettings({...settings, aboutContent: e.target.value})}
                  />
                  <p className="text-xs text-zinc-500">Hỗ trợ xuống dòng.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Giá bán mặc định (VNĐ)</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    step="1000"
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                    value={settings.photoPrice}
                    onChange={(e) => setSettings({...settings, photoPrice: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={savingSettings}
                    className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500"/></div>
            )}
          </div>

          {/* PASSWORD SETTINGS */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 space-y-6 h-fit">
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
               <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                 <Lock className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-white">Đổi mật khẩu Admin</h2>
                 <p className="text-zinc-400 text-sm">Cập nhật mật khẩu quản trị viên để bảo mật tốt hơn.</p>
               </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Mật khẩu mới</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Nhập lại mật khẩu mới</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận mật khẩu"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu mật khẩu mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;