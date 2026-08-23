
import { MEMORIAL_PORTRAIT_GAS_URL } from '../utils/constants';

// Tra cứu ảnh theo mã trong database của "Memorial Portrait" (app phục chế ảnh/di ảnh
// riêng biệt). Chỉ lấy link ảnh (dataUrl) để hiển thị — không chuyển hướng sang app đó.
export const getMemorialPortraitPhotoUrl = async (id: string): Promise<string | null> => {
  try {
    const response = await fetch(MEMORIAL_PORTRAIT_GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getPhoto', id })
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (json && json.success && json.photo && json.photo.dataUrl) {
      return json.photo.dataUrl as string;
    }
    return null;
  } catch (e) {
    console.warn('[getMemorialPortraitPhotoUrl] Lookup failed:', e);
    return null;
  }
};
