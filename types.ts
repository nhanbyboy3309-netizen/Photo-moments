
export interface NavItem {
  id: string;
  label: string;
  path: string;
  iconName?: string; // Tên icon từ Lucide (ví dụ: 'Printer', 'ShoppingCart')
  isExternal: boolean;
  isVisible: boolean;
}

export interface Photo {
  id: string; // The formatted ID e.g., 01022025001
  url: string; // Original URL
  fileName: string;
  createdAt: string;
  status: 'unpaid' | 'pending' | 'paid';
  customerEmail?: string;
  price: number;
  paymentStartedAt?: string;
  stampCode?: string; // New field for Partner/Stamp Code
}

export interface Product {
  id: string; // Barcode or SKU
  name: string;
  description: string;
  price: number;
  extraPrice?: number; // New: Price per extra item (e.g., extra photo beyond set of 4)
  costPrice: number; // Giá nhập
  imageUrl: string;
  stock: number; // Inventory count
  createdAt: string;
  type?: 'physical' | 'service'; // New: Distinguish between physical items and services
  serviceCode?: string; // New: Code to login to external web app
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  items: CartItem[];
  uploadedFiles: string[]; // URLs
  total: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paymentMethod?: 'cash' | 'transfer'; // Added field
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  changeAmount: number; // Positive for import, negative for export
  currentStock: number; // Stock after change
  type: 'import' | 'export' | 'sale' | 'adjustment';
  note?: string;
  createdAt: string;
}

export interface AdminUser {
  username: string;
  isAuthenticated: boolean;
}

export interface Partner {
  id: number;
  code: string; // PT001, PT002...
  name: string;
  businessName: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Stamp {
  id: number;
  code: string; // ST001, ST002...
  label: string; // Batch name or note
  isUsed: boolean;
  createdAt: string;
}

export interface SiteSettings {
  aboutTitle: string;
  aboutContent: string;
  photoPrice: number;
  
  // Branding
  logoType: 'image' | 'text';
  logoText: string;
  logoImageUrl: string;
  
  // Contact
  hotline: string;

  // Watermark Settings
  watermarkType: 'image' | 'text';
  watermarkText: string;
  watermarkImageUrl: string;
  
  // Payment & Admin Settings
  adminNotificationEmail: string; // Email to receive payment alerts
  bankName: string;      // e.g. ACB, VCB (Used for VietQR mapping or display)
  bankBin: string;       // e.g. 970416 (Bin code for VietQR)
  bankAccountNo: string;
  bankAccountName: string;

  // Features / Services Section
  feature1Title: string;
  feature1ImageUrl: string;
  feature2Title: string;
  feature2ImageUrl: string;
  feature3Title: string;
  feature3ImageUrl: string;

  // Printer Configuration
  defaultPrinterName: string;
  printerIp: string;
  printPriceA4: number; // Price per sheet A4 (Default 500)
  printPriceA3: number; // Price per sheet A3 (Default 1500)
  printPriceIdCard: number; // Price for ID Card print (Default 2000)

  // Navigation Items
  navigationItems: NavItem[];
}
