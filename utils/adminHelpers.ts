
import { Order } from '../types';

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) resolve(reader.result as string);
      else reject(new Error("File reading failed"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const currentline = lines[i].split(',');
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      let val = currentline[j]?.trim();
      if (val) val = val.replace(/^"|"$/g, '');
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(fieldName => {
        let val = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export const getAppBaseUrl = (): string => {
  const PRODUCTION_URL = "https://photo-moments-1041518508544.us-west1.run.app";
  return PRODUCTION_URL.endsWith('/') ? PRODUCTION_URL : `${PRODUCTION_URL}/`;
};

/**
 * Tạo URL mã QR có tích hợp logo (nếu logoUrl là public URL)
 */
export const getQrUrl = (text: string, logoUrl?: string, size: number = 300): string => {
  let url = `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=1&ecLevel=H`;
  // Chỉ thêm logo vào URL nếu logoUrl không phải base64 (API QuickChart cần URL thật)
  if (logoUrl && logoUrl.startsWith('http')) {
    url += `&centerImageUrl=${encodeURIComponent(logoUrl)}&centerImageWidth=20&centerImageHeight=20`;
  }
  return url;
};

// Fix: Add generateQRCard to handle card generation for both UploadTab and GalleryTab
export const generateQRCard = async (url: string, id: string, logoUrl?: string, logoText?: string): Promise<string> => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let logoImage: HTMLImageElement | null = null;
  if (logoUrl) {
    try {
      logoImage = new Image();
      logoImage.crossOrigin = "anonymous";
      logoImage.src = logoUrl;
      await new Promise((resolve, reject) => {
        logoImage!.onload = resolve;
        logoImage!.onerror = reject;
      });
      const logoH = 80;
      const aspect = logoImage.width / logoImage.height;
      const logoW = logoH * aspect;
      ctx.drawImage(logoImage, (canvas.width - logoW) / 2, 40, logoW, logoH);
    } catch (e) {
      console.warn("Logo failed to load", e);
    }
  }

  // Brand/Logo Text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(logoText || 'PHOTO MOMENTS', canvas.width / 2, 160);

  ctx.font = '24px Arial';
  ctx.fillStyle = '#666666';
  ctx.fillText('QUÉT ĐỂ TẢI ẢNH GỐC (HD)', canvas.width / 2, 210);

  // QR Code
  const qrSize = 380;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 260;
  const qrImg = new Image();
  qrImg.crossOrigin = "anonymous"; 
  // Dùng EC Level H (High) để QR vẫn đọc được khi bị logo che mất trung tâm
  qrImg.src = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=${qrSize}&margin=1&ecLevel=H`;
  
  try {
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
      });
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // --- Vẽ Logo vào giữa mã QR ---
      if (logoImage) {
          const innerLogoSize = qrSize * 0.22;
          const innerLogoX = qrX + (qrSize - innerLogoSize) / 2;
          const innerLogoY = qrY + (qrSize - innerLogoSize) / 2;

          // Vẽ nền trắng bo góc cho logo giữa QR
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          const r = 8;
          ctx.moveTo(innerLogoX - 4 + r, innerLogoY - 4);
          ctx.lineTo(innerLogoX + innerLogoSize + 4 - r, innerLogoY - 4);
          ctx.quadraticCurveTo(innerLogoX + innerLogoSize + 4, innerLogoY - 4, innerLogoX + innerLogoSize + 4, innerLogoY - 4 + r);
          ctx.lineTo(innerLogoX + innerLogoSize + 4, innerLogoY + innerLogoSize + 4 - r);
          ctx.quadraticCurveTo(innerLogoX + innerLogoSize + 4, innerLogoY + innerLogoSize + 4, innerLogoX + innerLogoSize + 4 - r, innerLogoY + innerLogoSize + 4);
          ctx.lineTo(innerLogoX - 4 + r, innerLogoY + innerLogoSize + 4);
          ctx.quadraticCurveTo(innerLogoX - 4, innerLogoY + innerLogoSize + 4, innerLogoX - 4, innerLogoY + innerLogoSize + 4 - r);
          ctx.lineTo(innerLogoX - 4, innerLogoY - 4 + r);
          ctx.quadraticCurveTo(innerLogoX - 4, innerLogoY - 4, innerLogoX - 4 + r, innerLogoY - 4);
          ctx.closePath();
          ctx.fill();

          ctx.drawImage(logoImage, innerLogoX, innerLogoY, innerLogoSize, innerLogoSize);
      }
  } catch (e) {
      console.warn("QR load fail", e);
      ctx.fillText("(QR Load Failed)", canvas.width/2, 450);
  }

  // Photo ID
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 54px monospace';
  ctx.fillText(id, canvas.width / 2, 720);

  // Footer Message
  ctx.font = '20px Arial';
  ctx.fillStyle = '#888888';
  ctx.fillText('Vui lòng thanh toán để mở khóa chất lượng cao', canvas.width / 2, 800);
  ctx.font = '14px Arial';
  ctx.fillText(window.location.hostname, canvas.width / 2, 850);

  try {
      return canvas.toDataURL('image/png');
  } catch (e) {
      console.error("Canvas Tainted - Fallback", e);
      throw new Error("Cannot generate card due to CORS policy on images.");
  }
};

export const generateOrderString = (order: Order): string => {
  const itemsList = order.items.map(i => `▫️ ${i.name} (x${i.quantity}): ${formatCurrency(i.price * i.quantity)}`).join('\n');
  const lookupLink = `${getAppBaseUrl()}#/lookup?id=${order.id}`;
  const dateStr = new Date(order.createdAt).toLocaleString('vi-VN');
  
  return `🌟 HÓA ĐƠN ĐIỆN TỬ - PHOTO MOMENTS 🌟
--------------------------------
Mã đơn: ${order.id}
Ngày: ${dateStr}
Khách hàng: ${order.customerName}
SĐT: ${order.customerPhone || '---'}
--------------------------------
CHI TIẾT DỊCH VỤ:
${itemsList}
--------------------------------
💰 TỔNG CỘNG: ${formatCurrency(order.total)}
📌 Trạng thái: ${order.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}
💳 PTTT: ${order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
--------------------------------
🔗 Tra cứu & Tải ảnh gốc tại đây:
${lookupLink}

Cảm ơn quý khách đã tin tưởng dịch vụ của chúng tôi!`;
};

/**
 * @deprecated Sử dụng zaloService.sendOrderZaloNotification thay thế
 */
export const shareToZalo = (order: Order) => {
    const text = generateOrderString(order);
    navigator.clipboard.writeText(text).then(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const zaloUrl = isMobile ? `https://zalo.me/${order.customerPhone}` : `https://chat.zalo.me/`;
        window.open(zaloUrl, '_blank');
    });
};
