import { Photo, SiteSettings } from '../types';

// NOTE: In a real production app, this file would be replaced by actual Firebase SDK calls 
// (Firestore, Storage, Auth) or Node.js API endpoints. 
// We are using localStorage to simulate a database so the app runs immediately.

const DB_KEY = 'photo_studio_db';
const AUTH_KEY = 'photo_studio_auth';
const PASSWORD_KEY = 'photo_studio_admin_password';
const SETTINGS_KEY = 'photo_studio_settings';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Database Logic ---

export const getPhotos = async (): Promise<Photo[]> => {
  await delay(500);
  const data = localStorage.getItem(DB_KEY);
  let photos: Photo[] = data ? JSON.parse(data) : [];

  // SIMULATION: Check for stuck "pending" payments that should have been confirmed by the "bank"
  // This handles the case where the user refreshed the page, killing the setTimeout.
  let changed = false;
  const now = Date.now();
  
  photos = photos.map(p => {
    if (p.status === 'pending' && p.paymentStartedAt) {
      const elapsed = now - new Date(p.paymentStartedAt).getTime();
      // If pending for more than 10 seconds, assume bank webhook arrived
      if (elapsed > 10000) { 
        console.log(`[Server Log] Resolving stuck payment for ${p.id}`);
        changed = true;
        return { ...p, status: 'paid' };
      }
    }
    return p;
  });

  if (changed) {
    localStorage.setItem(DB_KEY, JSON.stringify(photos));
  }

  return photos;
};

export const savePhoto = async (photo: Photo): Promise<void> => {
  const photos = await getPhotos();
  photos.unshift(photo);
  localStorage.setItem(DB_KEY, JSON.stringify(photos));
};

export const updatePhotoStatus = async (id: string, status: Photo['status'], email?: string): Promise<void> => {
  await delay(500);
  // We don't use getPhotos() here to avoid recursive logic with the auto-resolver, 
  // but for a mock it's fine to read raw or just use getPhotos (which might resolve others).
  // Let's read raw to be safe/simple for this specific update.
  const data = localStorage.getItem(DB_KEY);
  const photos: Photo[] = data ? JSON.parse(data) : [];

  const updated = photos.map(p => {
    if (p.id === id) {
      return { 
        ...p, 
        status, 
        customerEmail: email || p.customerEmail,
        paymentStartedAt: status === 'pending' ? new Date().toISOString() : p.paymentStartedAt
      };
    }
    return p;
  });
  localStorage.setItem(DB_KEY, JSON.stringify(updated));
  
  if (status === 'pending') {
    console.log(`[Server Log] Payment initiated for Photo ${id}. Waiting for Bank Webhook...`);
    
    // ---------------------------------------------------------
    // 🏦 BANK SIMULATION (Cass/Sepay/ACB API Webhook)
    // In a real app, the bank server calls your API. 
    // Here, we simulate the bank confirming the money after 5 seconds.
    // ---------------------------------------------------------
    setTimeout(() => {
        console.log(`[Webhook] Bank: Transaction received for PHOTO_${id}`);
        // Fetch fresh data (in case it changed)
        const currentData = localStorage.getItem(DB_KEY);
        const currentPhotos: Photo[] = currentData ? JSON.parse(currentData) : [];
        
        const autoUpdated = currentPhotos.map(p => {
            if (p.id === id) {
                return { ...p, status: 'paid' }; // Auto-confirm!
            }
            return p;
        });
        localStorage.setItem(DB_KEY, JSON.stringify(autoUpdated));
        console.log(`[Server Log] Photo ${id} automatically marked as PAID.`);
    }, 5000); // 5 Seconds delay
  }
  
  if (status === 'paid') {
    console.log(`[Server Log] Payment confirmed for Photo ${id}`);
  }
};

export const getPhotoById = async (id: string): Promise<Photo | null> => {
  // Short delay for read operations to make polling feel real
  await delay(200); 
  const photos = await getPhotos(); // This triggers the auto-resolve logic
  return photos.find(p => p.id === id) || null;
};

// --- Settings Logic ---

const DEFAULT_SETTINGS: SiteSettings = {
  aboutTitle: "Welcome to Photo Moment",
  aboutContent: `Established in 2016, Photo Moment has proudly served the community with professional photography and printing services that capture life’s most meaningful moments. Located in a convenient area, our studio specializes in ID photos (passport, visa, national ID), memorial portraits, photocopying, and a wide range of stationery supplies.\n\nWith years of experience and a passion for precision, we ensure every photo meets official standards while reflecting your best self. Our memorial portraits are handled with care and respect, preserving cherished memories with elegance and dignity.\n\nBeyond photography, Photo Moment is your one-stop shop for fast, reliable document printing and essential office supplies—from pens and paper to folders and forms.\n\nAt Photo Moment, we believe every image tells a story. Let us help you tell yours with clarity, warmth, and professionalism.`,
  photoPrice: 50000,
  logoType: 'image',
  logoText: 'PHOTO MOMENTS',
  logoImageUrl: './watermark/logo.png'
};

export const getSettings = async (): Promise<SiteSettings> => {
  await delay(200);
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return DEFAULT_SETTINGS;

  const parsed = JSON.parse(data);
  // Merge with default to ensure new fields (like logoType) exist for old data
  return { ...DEFAULT_SETTINGS, ...parsed };
};

export const saveSettings = async (settings: SiteSettings): Promise<void> => {
  await delay(500);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};


// --- Upload Logic (Renaming) ---

export const generatePhotoId = async (): Promise<string> => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const datePrefix = `${day}${month}${year}`;

  const photos = await getPhotos();
  
  // Find photos uploaded today
  const todaysPhotos = photos.filter(p => p.id.startsWith(datePrefix));
  
  let nextSeq = 1;
  if (todaysPhotos.length > 0) {
    // Extract max sequence
    const maxSeq = Math.max(...todaysPhotos.map(p => parseInt(p.id.slice(-3))));
    nextSeq = maxSeq + 1;
  }

  return `${datePrefix}${String(nextSeq).padStart(3, '0')}`;
};

// --- Auth Logic ---

export const checkAuth = (): boolean => {
  return localStorage.getItem(AUTH_KEY) === 'true';
};

export const login = async (password: string): Promise<boolean> => {
  await delay(800);
  const storedPassword = localStorage.getItem(PASSWORD_KEY) || 'admin123';
  if (password === storedPassword) {
    localStorage.setItem(AUTH_KEY, 'true');
    return true;
  }
  return false;
};

export const updatePassword = async (newPassword: string): Promise<void> => {
    await delay(500);
    localStorage.setItem(PASSWORD_KEY, newPassword);
};

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
};