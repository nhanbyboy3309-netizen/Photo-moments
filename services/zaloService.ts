
import { Order } from '../types';
import { generateOrderString } from '../utils/adminHelpers';

/**
 * Service xử lý liên kết Zalo.
 * Hiện tại hỗ trợ copy nội dung và mở ứng dụng.
 * Sẵn sàng mở rộng để gọi API Zalo OA / ZNS.
 */
export const zaloService = {
  /**
   * Hàm này được thiết kế để sau này gọi API gửi tin nhắn tự động qua Zalo OA
   */
  async sendOrderZaloNotification(order: Order): Promise<{ success: boolean; message: string }> {
    console.log("Mở rộng sau này: Gọi API gửi ZNS cho số:", order.customerPhone);
    
    // Giả lập logic gọi API (sau này bạn sẽ thay bằng fetch tới backend của mình)
    // const response = await fetch('/api/zalo/send-zns', { method: 'POST', body: JSON.stringify(order) });
    
    try {
      const text = generateOrderString(order);
      await navigator.clipboard.writeText(text);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const zaloUrl = isMobile ? `https://zalo.me/${order.customerPhone}` : `https://chat.zalo.me/`;
      
      // Mở Zalo (nếu có số điện thoại sẽ mở trực tiếp trang chat với số đó)
      window.open(zaloUrl, '_blank');
      
      return { 
        success: true, 
        message: "Đã copy hóa đơn và đang mở Zalo..." 
      };
    } catch (err) {
      return { 
        success: false, 
        message: "Không thể copy nội dung hóa đơn." 
      };
    }
  }
};
