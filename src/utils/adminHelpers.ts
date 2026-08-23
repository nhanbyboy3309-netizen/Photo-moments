export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value);
}

export function parseCSV(text: string): any[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let insideQuote = false;
    let currentVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());
    
    const obj: any = {};
    headers.forEach((header, index) => {
      let finalVal = values[index] || '';
      if (finalVal.startsWith('"') && finalVal.endsWith('"')) {
        finalVal = finalVal.slice(1, -1);
      }
      obj[header] = finalVal;
    });
    return obj;
  });
}

export function exportToCSV(data: any[], filename: string = 'export.csv') {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const cell = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
      const escaped = cell.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(','))
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export function getQrUrl(data: string, logoUrl?: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function getAppBaseUrl(): string {
  const origin = window.location.origin;
  const path = window.location.pathname;
  return origin + path + (path.endsWith('/') ? '' : '/');
}

export async function generateQRCard(
  qrLink: string,
  photoId: string,
  watermarkImageUrl?: string,
  logoText?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error("Cannot get canvas context"));
      return;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(1, '#1f2937');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((logoText || 'PHOTO MOMENTS').toUpperCase(), canvas.width / 2, 75);

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('NƠI LƯU GIỮ NHỮNG KHOẢNH KHẮC TUYỆT VỜI', canvas.width / 2, 105);

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrLink)}`;

    qrImg.onload = () => {
      const x = 70;
      const y = 145;
      const width = 260;
      const height = 260;
      const radius = 16;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      ctx.drawImage(qrImg, x + 15, y + 15, width - 30, height - 30);

      ctx.fillStyle = '#1e293b';
      const px = 90;
      const py = 432;
      const pwidth = 220;
      const pheight = 36;
      const pradius = 18;
      ctx.beginPath();
      ctx.moveTo(px + pradius, py);
      ctx.lineTo(px + pwidth - pradius, py);
      ctx.quadraticCurveTo(px + pwidth, py, px + pwidth, py + pradius);
      ctx.lineTo(px + pwidth, py + pheight - pradius);
      ctx.quadraticCurveTo(px + pwidth, py + pheight, px + pwidth - pradius, py + pheight);
      ctx.lineTo(px + pradius, py + pheight);
      ctx.quadraticCurveTo(px, py + pheight, px, py + pheight - pradius);
      ctx.lineTo(px, py + pradius);
      ctx.quadraticCurveTo(px, py, px + pradius, py);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`MÃ SỐ ẢNH: ${photoId}`, canvas.width / 2, 455);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('Quét mã QR bằng Điện thoại để tải ảnh', canvas.width / 2, 502);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText('Hệ thống lưu giữ ảnh sắc nét và bảo mật tuyệt đối', canvas.width / 2, 532);

      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      ctx.fillText('POWERED BY PHOTO MOMENTS SYSTEMS', canvas.width / 2, 565);

      resolve(canvas.toDataURL('image/png'));
    };

    qrImg.onerror = (err) => {
      ctx.fillStyle = '#ef4444';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Lỗi tải mã QR', canvas.width / 2, 280);
      resolve(canvas.toDataURL('image/png'));
    };
  });
}
