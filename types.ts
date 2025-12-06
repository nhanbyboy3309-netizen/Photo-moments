export interface Photo {
  id: string; // The formatted ID e.g., 01022025001
  url: string; // Original URL
  fileName: string;
  createdAt: string;
  status: 'unpaid' | 'pending' | 'paid';
  customerEmail?: string;
  price: number;
  paymentStartedAt?: string;
}

export interface AdminUser {
  username: string;
  isAuthenticated: boolean;
}

export interface SiteSettings {
  aboutTitle: string;
  aboutContent: string;
  photoPrice: number;
  logoType: 'image' | 'text';
  logoText: string;
  logoImageUrl: string;
}