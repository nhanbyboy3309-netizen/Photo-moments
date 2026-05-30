
import { Photo, SiteSettings, Partner, Product, Order, CartItem, InventoryLog, Stamp, NavItem } from '../types';
import { formatCurrency } from '../utils/adminHelpers';

// ⚠️ REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL ⚠️
const GAS_URL = "https://script.google.com/macros/s/AKfycbx0JkpC2yDVWyYKB-HwTsqYZDV9tEzvD0uGTBPWPEa6flFqZY9yZKvDfQ3OB3eNkbCdig/exec";

// --- LOCAL STORAGE KEYS FOR OFFLINE FALLBACK ---
const LS_KEYS = {
    SETTINGS: 'pm_settings',
    PHOTOS: 'pm_photos',
    PRODUCTS: 'pm_products',
    ORDERS: 'pm_orders',
    INVENTORY: 'pm_inventory',
    PARTNERS: 'pm_partners',
    STAMPS: 'pm_stamps'
};

// --- MOCK DATA GENERATORS ---
const DEFAULT_NAV: NavItem[] = [
  { id: '1', label: 'Trang chủ', path: '/', isVisible: true, isExternal: false },
  { id: '2', label: 'Dịch vụ', path: '/services', isVisible: true, isExternal: false },
  { id: '3', label: 'In tài liệu', path: '/print', isVisible: true, isExternal: false, iconName: 'Printer' },
  { id: '4', label: 'Tra cứu', path: '/lookup', isVisible: true, isExternal: false },
  { id: '5', label: 'Giỏ hàng', path: '/cart', isVisible: true, isExternal: false, iconName: 'ShoppingCart' },
  { id: '6', label: 'Admin', path: '/admin', isVisible: true, isExternal: false }
];

const DEFAULT_SETTINGS: SiteSettings = {
  aboutTitle: "Về chúng tôi",
  aboutContent: "Nơi lưu giữ những khoảnh khắc đẹp nhất của bạn.",
  photoPrice: 50000,
  logoType: 'text',
  logoText: 'PHOTO MOMENTS',
  logoImageUrl: '',
  hotline: '0909000111',
  watermarkType: 'text',
  watermarkText: 'Photo Moments',
  watermarkImageUrl: '',
  adminNotificationEmail: 'infor.photomoments@gmail.com', // Updated to system email
  bankName: 'MB Bank',
  bankBin: '970423',
  bankAccountNo: '000000000000',
  bankAccountName: 'NGUYEN VAN A',
  feature1Title: 'Chụp ảnh thẻ',
  feature1ImageUrl: '',
  feature2Title: 'In ảnh lấy ngay',
  feature2ImageUrl: '',
  feature3Title: 'Phục hồi ảnh cũ',
  feature3ImageUrl: '',
  defaultPrinterName: 'Canon LBP 2900',
  printerIp: '192.168.1.100',
  printPriceA4: 1000,
  printPriceA3: 3000,
  printPriceIdCard: 2000,
  navigationItems: DEFAULT_NAV
};

// --- DEFAULT PRODUCTS & SERVICES ---
const INITIAL_PRODUCTS: Product[] = [
    {
        id: 'SVC_3X4',
        name: 'Ảnh thẻ 3x4 (Set 4 ảnh)',
        description: 'Chụp và in ảnh thẻ chuẩn hồ sơ, nền xanh/trắng. Giá bao gồm 1 set 4 tấm.',
        price: 25000,
        extraPrice: 5000, // Giá cho mỗi ảnh thêm
        costPrice: 5000,
        stock: 9999,
        imageUrl: 'https://images.unsplash.com/photo-1635446342676-c98547b748dd?w=800&q=80',
        createdAt: new Date().toISOString(),
        type: 'service',
        serviceCode: 'PTS-34'
    },
    {
        id: 'SVC_4X6',
        name: 'Ảnh thẻ 4x6 (Set 4 ảnh)',
        description: 'Chụp ảnh chuẩn Visa/Hộ chiếu. Chỉnh sửa da và trang phục cơ bản.',
        price: 30000,
        extraPrice: 5000,
        costPrice: 6000,
        stock: 9999,
        imageUrl: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&q=80',
        createdAt: new Date().toISOString(),
        type: 'service',
        serviceCode: 'PTS-46'
    },
    {
        id: 'SVC_PROFILE',
        name: 'Chụp Profile Cá Nhân',
        description: 'Gói chụp chân dung doanh nhân, CV. Giao file gốc và 5 ảnh chỉnh sửa.',
        price: 500000,
        extraPrice: 50000,
        costPrice: 50000,
        stock: 999,
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
        createdAt: new Date().toISOString(),
        type: 'service',
        serviceCode: 'PTS-PRO'
    }
];

// --- FALLBACK HANDLER ---
const handleMockAction = (action: string, payload: any): any => {
    // console.warn(`[Offline Mode] Handling locally: ${action}`); // Optional: reduce noise
    
    switch(action) {
        // SETTINGS
        case 'get_settings': {
            const stored = localStorage.getItem(LS_KEYS.SETTINGS);
            return stored ? JSON.parse(stored) : null;
        }
        case 'save_settings': {
            localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(payload.settings));
            return payload.settings;
        }

        // PHOTOS
        case 'get_photos':
            return JSON.parse(localStorage.getItem(LS_KEYS.PHOTOS) || '[]');
        case 'save_photo': {
            const photos = JSON.parse(localStorage.getItem(LS_KEYS.PHOTOS) || '[]');
            // Avoid duplicates if reusing ID
            const existingIdx = photos.findIndex((p: any) => p.id === payload.photo.id);
            if (existingIdx >= 0) photos[existingIdx] = payload.photo;
            else photos.push(payload.photo);
            
            localStorage.setItem(LS_KEYS.PHOTOS, JSON.stringify(photos));
            return payload.photo;
        }
        case 'update_photo': {
            const photos = JSON.parse(localStorage.getItem(LS_KEYS.PHOTOS) || '[]');
            const idx = photos.findIndex((p: any) => p.id === payload.id);
            if (idx !== -1) {
                photos[idx] = { ...photos[idx], ...payload.updates };
                localStorage.setItem(LS_KEYS.PHOTOS, JSON.stringify(photos));
            }
            return { success: true };
        }
        case 'delete_photo': {
            let photos = JSON.parse(localStorage.getItem(LS_KEYS.PHOTOS) || '[]');
            photos = photos.filter((p: any) => p.id !== payload.id);
            localStorage.setItem(LS_KEYS.PHOTOS, JSON.stringify(photos));
            return { success: true };
        }

        // PRODUCTS
        case 'get_products':
             const storedProds = localStorage.getItem(LS_KEYS.PRODUCTS);
             // Return default services if storage is empty
             return storedProds ? JSON.parse(storedProds) : INITIAL_PRODUCTS;
        case 'save_product': {
             const products = JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
             const exists = products.findIndex((p:any) => p.id === payload.product.id);
             if (exists !== -1) products[exists] = payload.product;
             else products.push(payload.product);
             localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
             return payload.product;
        }
        case 'update_product': {
             const products = JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
             const idx = products.findIndex((p: any) => p.id === payload.id);
             if (idx !== -1) {
                 products[idx] = { ...products[idx], ...payload.updates };
                 localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
             }
             return { success: true };
        }
        case 'delete_product': {
             let products = JSON.parse(localStorage.getItem(LS_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
             products = products.filter((p:any) => p.id !== payload.id);
             localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
             return { success: true };
        }

        // ORDERS
        case 'get_orders':
             return JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
        case 'create_order': {
             const orders = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
             orders.push(payload.order);
             localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
             return payload.order;
        }
        case 'update_order': {
             const orders = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
             const idx = orders.findIndex((o: any) => o.id === payload.id);
             if (idx !== -1) {
                 orders[idx] = { ...orders[idx], ...payload.updates };
                 localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
             }
             return { success: true };
        }

        // FILES
        case 'upload_file':
            // For mock, simply return the base64 data as the URL
            return { url: payload.fileData };

        // STAMPS & PARTNERS (Simple array storage)
        case 'get_stamps': return JSON.parse(localStorage.getItem(LS_KEYS.STAMPS) || '[]');
        case 'create_stamp': {
            const items = JSON.parse(localStorage.getItem(LS_KEYS.STAMPS) || '[]');
            items.push(payload.stamp);
            localStorage.setItem(LS_KEYS.STAMPS, JSON.stringify(items));
            return payload.stamp;
        }
        case 'delete_stamp': {
            let items = JSON.parse(localStorage.getItem(LS_KEYS.STAMPS) || '[]');
            items = items.filter((i:any) => i.id !== payload.id);
            localStorage.setItem(LS_KEYS.STAMPS, JSON.stringify(items));
            return { success: true };
        }
        case 'get_partners': return JSON.parse(localStorage.getItem(LS_KEYS.PARTNERS) || '[]');
        case 'create_partner': {
            const items = JSON.parse(localStorage.getItem(LS_KEYS.PARTNERS) || '[]');
            items.push(payload.partner);
            localStorage.setItem(LS_KEYS.PARTNERS, JSON.stringify(items));
            return payload.partner;
        }
        case 'update_partner': {
            const items = JSON.parse(localStorage.getItem(LS_KEYS.PARTNERS) || '[]');
            const idx = items.findIndex((i: any) => i.id === payload.id);
            if (idx !== -1) {
                items[idx] = { ...items[idx], ...payload.updates };
                localStorage.setItem(LS_KEYS.PARTNERS, JSON.stringify(items));
            }
            return { success: true };
        }
        case 'delete_partner': {
            let items = JSON.parse(localStorage.getItem(LS_KEYS.PARTNERS) || '[]');
            items = items.filter((i:any) => i.id !== payload.id);
            localStorage.setItem(LS_KEYS.PARTNERS, JSON.stringify(items));
            return { success: true };
        }

        default:
            return {};
    }
};

// --- API HELPER ---
const apiCall = async (action: string, payload: any = {}) => {
  try {
    const controller = new AbortController();
    // INCREASED TIMEOUT: 8s -> 30s to prevent 'signal is aborted' errors on slow GAS responses
    const timeoutId = setTimeout(() => controller.abort(), 30000); 

    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const text = await response.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        throw new Error("Invalid JSON response from server");
    }

    if (json.status === 'error') throw new Error(json.message);
    return json.data;

  } catch (error: any) {
    // Only log actual errors, not aborts or fetch failures (which imply offline)
    if (error.name !== 'AbortError' && error.message !== 'Failed to fetch') {
       console.warn(`[Backend] API Warning (${action}):`, error.message);
    } else if (error.message === 'Failed to fetch') {
       // console.log("Network/CORS error, switching to offline mode");
    }
    
    // If API fails, fall back to local storage simulation
    return handleMockAction(action, payload);
  }
};

export const checkAuth = (): boolean => localStorage.getItem('photo_admin_session') === 'true';

export const login = async (password: string): Promise<boolean> => {
  const settings = await getSettings();
  const adminPass = (settings as any).adminPassword || 'admin123';
  if (password === adminPass) {
    localStorage.setItem('photo_admin_session', 'true');
    return true;
  }
  return false;
};

export const logout = () => localStorage.removeItem('photo_admin_session');

export const updatePassword = async (newPassword: string): Promise<void> => {
  const settings = await getSettings();
  await saveSettings({ ...settings, ['adminPassword']: newPassword } as any);
};

export const getSettings = async (): Promise<SiteSettings> => {
  try {
    const data = await apiCall('get_settings');
    // Ensure navigation items structure is valid if null
    const base = data || {};
    return { ...DEFAULT_SETTINGS, ...base };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (newSettings: SiteSettings): Promise<void> => {
  await apiCall('save_settings', { settings: newSettings });
};

export const getPhotos = async (): Promise<Photo[]> => {
  const data = await apiCall('get_photos');
  return data || [];
};

export const getPhotoById = async (id: string): Promise<Photo | null> => {
  const photos = await getPhotos();
  return photos.find(p => String(p.id) === String(id)) || null;
};

export const getPhotoByStampCode = async (stampCode: string): Promise<Photo | null> => {
  const photos = await getPhotos();
  return photos.find(p => p.stampCode === stampCode) || null;
};

export const savePhoto = async (photo: Photo): Promise<void> => {
  await apiCall('save_photo', { photo });
};

export const deletePhoto = async (photoId: string, fileName?: string): Promise<void> => {
  await apiCall('delete_photo', { id: photoId });
};

export const updatePhotoStatus = async (id: string, status: Photo['status'], email?: string): Promise<void> => {
  const updates: any = { status };
  if (email) updates.customerEmail = email;
  if (status === 'pending') updates.paymentStartedAt = new Date().toISOString();
  await apiCall('update_photo', { id, updates });
};

export const updatePhoto = async (id: string, updates: Partial<Photo>): Promise<void> => {
  await apiCall('update_photo', { id, updates });
};

export const generatePhotoId = async (): Promise<string> => {
  const now = new Date();
  const prefix = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${random}`;
};

export const getStamps = async (): Promise<Stamp[]> => {
  const data = await apiCall('get_stamps');
  return data || [];
};

export const createStamp = async (stamp: Partial<Stamp>): Promise<void> => {
  const newStamp = {
    ...stamp,
    code: stamp.code || `ST${Date.now()}`,
    isUsed: false,
    createdAt: new Date().toISOString()
  };
  await apiCall('create_stamp', { stamp: newStamp });
};

export const deleteStamp = async (id: number): Promise<void> => {
  await apiCall('delete_stamp', { id });
};

export const getPartners = async (): Promise<Partner[]> => {
  const data = await apiCall('get_partners');
  return data || [];
};

export const createPartner = async (partner: Partial<Partner>): Promise<void> => {
  const newPartner = { ...partner, createdAt: new Date().toISOString() };
  await apiCall('create_partner', { partner: newPartner });
};

export const updatePartner = async (id: number, updates: Partial<Partner>): Promise<void> => {
  await apiCall('update_partner', { id, updates });
};

export const deletePartner = async (id: number): Promise<void> => {
  await apiCall('delete_partner', { id });
};

export const verifyPartnerCode = async (code: string, photoId: string): Promise<{valid: boolean, type: 'free' | 'half' | 'none', message: string}> => {
  const partners = await getPartners();
  const partner = partners.find(p => p.code === code);
  if (partner) return { valid: true, type: 'free', message: `Mã đối tác ${partner.name} áp dụng thành công!` };
  return { valid: false, type: 'none', message: 'Mã không hợp lệ hoặc không tồn tại.' };
};

export const redeemPartnerCode = async (code: string, photoId: string, type: string): Promise<void> => {
  console.log(`Code ${code} redeemed for ${photoId}`);
};

export const getProducts = async (): Promise<Product[]> => {
  const data = await apiCall('get_products');
  return (data || INITIAL_PRODUCTS).map((p: any) => ({
    ...p,
    price: Number(p.price),
    extraPrice: Number(p.extraPrice || 0), // Fix: Ensure extraPrice is parsed
    costPrice: Number(p.costPrice || 0),
    stock: Number(p.stock || 0),
    // FIX: Auto-detect 'service' type if missing but ID starts with 'SVC'
    // This fixes the issue where services created in Sheets without 'type' column show as physical products
    type: p.type || (String(p.id).startsWith('SVC') ? 'service' : 'physical'), 
    serviceCode: p.serviceCode || ''
  }));
};

// ROBUST SAVE/UPDATE Logic
export const saveProduct = async (product: Omit<Product, 'createdAt'> & { createdAt?: string }): Promise<void> => {
  const products = await getProducts();
  const exists = products.find(p => p.id === product.id);
  
  if (exists) {
      await apiCall('update_product', { 
          id: product.id, 
          updates: product 
      });
  } else {
      const payload = { ...product, createdAt: product.createdAt || new Date().toISOString() };
      await apiCall('save_product', { product: payload });
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  await apiCall('delete_product', { id });
};

export const bulkImportProducts = async (products: Partial<Product>[]): Promise<void> => {
  for (const p of products) if (p.id) await saveProduct(p as Product);
};

export const getInventoryLogs = async (): Promise<InventoryLog[]> => {
  // If backend logs are not available or 404, return empty locally
  try {
      const data = await apiCall('get_inventory_logs');
      return data || [];
  } catch(e) { return []; }
};

export const logInventoryChange = async (productId: string, productName: string, changeAmount: number, newStock: number, type: InventoryLog['type'], note?: string): Promise<void> => {
  const log = { productId, productName, changeAmount, currentStock: newStock, type, note, createdAt: new Date().toISOString() };
  await apiCall('log_inventory', { log });
};

export const updateProductStock = async (id: string, quantity: number, mode: 'add' | 'set' | 'subtract' = 'set', note: string = "Stock Update"): Promise<void> => {
  const products = await getProducts();
  const product = products.find(p => p.id === id);
  if (product && product.type !== 'service') {
    let newStock = product.stock;
    if (mode === 'add') newStock += quantity;
    else if (mode === 'subtract') newStock = Math.max(0, product.stock - quantity);
    else newStock = quantity;
    
    const change = newStock - product.stock;
    await saveProduct({ ...product, stock: newStock });
    if (change !== 0) await logInventoryChange(id, product.name, change, newStock, change > 0 ? 'import' : 'export', note);
  }
};

export const getOrders = async (): Promise<Order[]> => {
  const data = await apiCall('get_orders');
  return data || [];
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const orders = await getOrders();
  return orders.find(o => String(o.id) === String(id)) || null;
};

export const createOrder = async (order: Order, isPos: boolean = false): Promise<void> => {
  // PASS CURRENT APP URL for email links
  const appUrl = window.location.origin + window.location.pathname;
  await apiCall('create_order', { order, appUrl });
  
  if (isPos || order.status === 'paid') {
    for (const item of order.items) {
      if (item.type !== 'service') {
        await updateProductStock(item.id, item.quantity, 'subtract', `Order/POS #${order.id}`);
      }
    }
  }
};

export const updateOrderStatus = async (orderId: string, status: 'paid' | 'pending'): Promise<void> => {
  await apiCall('update_order', { id: orderId, updates: { status } });
  const order = await getOrderById(orderId);
  if (status === 'paid' && order) {
     if (order.paymentMethod === 'transfer') { 
         for (const item of order.items) {
             if (item.type !== 'service') {
                await updateProductStock(item.id, item.quantity, 'subtract', `Order Update #${orderId}`);
             }
         }
     }
  }
};

export const confirmOrderPayment = async (orderId: string, amount: number, customerEmail: string): Promise<void> => {
  // Logic mostly for notification here
};

export const processPaymentConfirmation = async (type: 'photo' | 'order', id: string): Promise<{success: boolean, message: string}> => {
  if (type === 'photo') {
      await updatePhotoStatus(id, 'paid');
      return { success: true, message: `Đã kích hoạt ảnh ${id}.` };
  }
  if (type === 'order') {
      await updateOrderStatus(id, 'paid');
      return { success: true, message: `Đã xác nhận đơn hàng ${id}.` };
  }
  return { success: false, message: "Loại giao dịch không hợp lệ." };
};

// --- FILE UPLOAD (Mocking Supabase Storage behavior using GAS Drive) ---
export const uploadFile = async (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const base64 = reader.result as string;
                // Try sending to backend, if fails, use local base64 mock
                const res = await apiCall('upload_file', { 
                    fileData: base64, 
                    fileName: file.name, 
                    mimeType: file.type 
                });
                
                if (res && res.url) {
                    resolve(res.url);
                } else {
                    resolve(base64); // Fallback to base64 if no URL returned
                }
            } catch (err) {
                // Critical Fallback: if upload call fails (e.g. backend down), return base64
                // This allows the app to "work" offline for the current session at least
                if (reader.result) resolve(reader.result as string);
                else reject(err);
            }
        };
        reader.onerror = error => reject(error);
    });
};
