
// URL ứng dụng "ID Photo Booth Pro" — nơi khách chụp ảnh thẻ sau khi mua gói dịch vụ,
// và nơi tra cứu ảnh đã chụp khi mã không tìm thấy trong database của photo-moments.
// LƯU Ý: app đã được publish lại sang project Google Cloud khác (gen-lang-client-0496040021)
// với domain idphotomoments.ai.studio — URL Cloud Run cũ (project 926601180918) đã ngừng
// nhận bản cập nhật mới, dùng nhầm URL cũ là nguyên nhân lỗi "sai apiKey" kéo dài trước đó.
export const PHOTO_BOOTH_PRO_URL = "https://idphotomoments.ai.studio";

// Google Apps Script (database) của "Memorial Portrait" — app phục chế ảnh/di ảnh 20x30.
// Chỉ dùng để tra cứu ảnh theo mã và lấy link ảnh trực tiếp, không chuyển hướng sang app đó.
export const MEMORIAL_PORTRAIT_GAS_URL = "https://script.google.com/macros/s/AKfycbzYupbe7DhcLUGPUUJ3VbkRkpMj1ioRyfn2LlPYwPt0t_VUao4Wl_XT8-vxbojU39Nl/exec";
