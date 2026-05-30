
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  checkAuth, login, logout, getPhotos, updatePhotoStatus, getSettings, saveSettings, deletePhoto, updatePhoto 
} from '../services/mockBackend';
import { Photo, SiteSettings } from '../types';
import { 
  Upload, LogOut, Settings, Image as ImageIcon, Loader2, ShoppingBag, Package, MonitorPlay, Layers, Archive, Menu, BarChart3, Stamp, CreditCard 
} from 'lucide-react';
import { getAppBaseUrl } from '../utils/adminHelpers';

// Sub-components
import LoginForm from '../components/admin/LoginForm';
import UploadTab from '../components/admin/UploadTab';
import GalleryTab from '../components/admin/GalleryTab';
import SettingsTab from '../components/admin/SettingsTab';
import ServicesTab from '../components/admin/ServicesTab';
import InventoryTab from '../components/admin/InventoryTab';
import PosTab from '../components/admin/PosTab';
import ReportTab from '../components/admin/ReportTab';
import StampCodeTab from '../components/admin/StampCodeTab';
import RecentTransactionsTab from '../components/admin/RecentTransactionsTab';

// ============================================================================
// 📌 MAIN CONTROLLER: ADMIN
// ============================================================================

type MainTab = 'transactions' | 'photos' | 'services' | 'pos' | 'reports' | 'settings';
type PhotoSubTab = 'upload' | 'gallery' | 'stamp';
type ServiceSubTab = 'products' | 'inventory';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>('transactions');
  const [photoSubTab, setPhotoSubTab] = useState<PhotoSubTab>('upload');
  const [serviceSubTab, setServiceSubTab] = useState<ServiceSubTab>('products');

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  
  // Robust base URL calculation for QR generation
  const baseUrl = useMemo(() => getAppBaseUrl(), []);

  // Fetch Data Callback
  const loadInitialData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getPhotos(), getSettings()]);
      setPhotos(p);
      setSettings(s);
    } catch (error) {
      console.error("Failed to load admin data", error);
    }
  }, []);

  useEffect(() => {
    setIsAuthenticated(checkAuth());
    if (checkAuth()) loadInitialData();
  }, [loadInitialData]);

  const handleLogin = useCallback(async (password: string) => {
    const success = await login(password);
    if (success) {
      setIsAuthenticated(true);
      loadInitialData();
    }
    return success;
  }, [loadInitialData]);

  const handleLogout = useCallback(() => {
    logout();
    setIsAuthenticated(false);
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, status: Photo['status']) => {
    await updatePhotoStatus(id, status);
    loadInitialData(); 
  }, [loadInitialData]);
  
  const handleUpdatePhotoDetails = useCallback(async (id: string, updates: Partial<Photo>) => {
    await updatePhoto(id, updates);
    loadInitialData();
  }, [loadInitialData]);

  const handleDeletePhoto = useCallback(async (id: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete photo ${id}? This cannot be undone.`)) {
      try {
        await deletePhoto(id, fileName);
        alert("Photo deleted successfully");
        loadInitialData();
      } catch (error) {
        console.error("Delete failed", error);
        alert("Failed to delete photo");
      }
    }
  }, [loadInitialData]);

  const handleSaveSettings = useCallback(async (newSettings: SiteSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings); 
  }, []);

  if (!isAuthenticated) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto min-h-screen flex flex-col">
      {/* 🔹 HEADER & NAVIGATION */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 lg:p-6 lg:static lg:bg-transparent lg:border-none">
        <div className="flex items-center justify-between mb-4 lg:mb-8">
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tighter flex items-center gap-2">
                <span className="lg:hidden"><Menu className="w-6 h-6"/></span>
                Dashboard
            </h1>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg transition-colors text-sm font-bold">
              <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Sign Out</span>
            </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar lg:border-b lg:border-zinc-800 lg:pb-0 lg:gap-4">
            {[
              { id: 'transactions', label: 'Giao dịch', icon: CreditCard },
              { id: 'photos', label: 'Quản lý Ảnh', icon: ImageIcon },
              { id: 'services', label: 'Dịch vụ & Kho', icon: Layers },
              { id: 'pos', label: 'Bán hàng (POS)', icon: MonitorPlay },
              { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
              { id: 'settings', label: 'Cấu hình', icon: Settings }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MainTab)}
                className={`flex-shrink-0 px-4 py-3 rounded-lg lg:rounded-none lg:rounded-t-lg font-medium transition-all text-sm lg:text-base flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-zinc-800 text-white lg:bg-transparent lg:border-b-2 lg:border-white' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 lg:hover:bg-transparent lg:border-b-2 lg:border-transparent'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4 lg:w-5 lg:h-5" />}
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      <div className="p-4 lg:p-10 flex-1">
        {/* ================= TRANSACTIONS SECTION ================= */}
        {activeTab === 'transactions' && (
           <RecentTransactionsTab />
        )}

        {/* ================= PHOTOS SECTION ================= */}
        {activeTab === 'photos' && (
          <div className="animate-fade-in">
             <div className="flex gap-2 mb-6 bg-zinc-900/50 p-1 rounded-lg w-fit border border-zinc-800 overflow-x-auto">
                <button 
                  onClick={() => setPhotoSubTab('upload')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                    photoSubTab === 'upload' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
                <button 
                  onClick={() => setPhotoSubTab('gallery')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                    photoSubTab === 'gallery' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> Gallery ({photos.length})
                </button>
                <button 
                  onClick={() => setPhotoSubTab('stamp')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                    photoSubTab === 'stamp' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Stamp className="w-4 h-4" /> Stamp Code
                </button>
             </div>

             {photoSubTab === 'upload' && (
                <UploadTab 
                  settings={settings} 
                  onPhotoUploaded={loadInitialData} 
                  baseUrl={baseUrl} 
                />
             )}

             {photoSubTab === 'gallery' && (
                <GalleryTab 
                  photos={photos} 
                  onUpdateStatus={handleUpdateStatus} 
                  onDelete={handleDeletePhoto}
                  onEdit={handleUpdatePhotoDetails}
                  baseUrl={baseUrl}
                  settings={settings}
                />
             )}

             {photoSubTab === 'stamp' && (
               <StampCodeTab />
             )}
          </div>
        )}

        {/* ================= SERVICES SECTION ================= */}
        {activeTab === 'services' && (
          <div className="animate-fade-in">
             <div className="flex gap-2 mb-6 bg-zinc-900/50 p-1 rounded-lg w-fit border border-zinc-800">
                <button 
                  onClick={() => setServiceSubTab('products')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${
                    serviceSubTab === 'products' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" /> Sản phẩm
                </button>
                <button 
                  onClick={() => setServiceSubTab('inventory')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${
                    serviceSubTab === 'inventory' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Package className="w-4 h-4" /> Kho & Lịch sử
                </button>
             </div>

             {serviceSubTab === 'products' ? (
                <ServicesTab />
             ) : (
                <InventoryTab settings={settings} />
             )}
          </div>
        )}

        {/* ================= POS SECTION ================= */}
        {activeTab === 'pos' && (
          <PosTab />
        )}

        {/* ================= REPORTS SECTION ================= */}
        {activeTab === 'reports' && (
          <ReportTab />
        )}

        {/* ================= SETTINGS SECTION ================= */}
        {activeTab === 'settings' && settings && (
          <SettingsTab 
            initialSettings={settings} 
            onSave={handleSaveSettings} 
          />
        )}
        
        {activeTab === 'settings' && !settings && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
