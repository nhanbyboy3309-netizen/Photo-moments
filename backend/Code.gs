
// --- CONFIGURATION ---
const DRIVE_FOLDER_ID = ""; // Optional: Specific folder for uploads

/**
 * ⚠️ QUAN TRỌNG: CẤP QUYỀN
 * 1. Chạy hàm 'grantPermissions'.
 * 2. Deploy lại: 'Execute as: Me' -> 'Who has access: Anyone'.
 */
function grantPermissions() {
  const drive = DriveApp.getRootFolder();
  const files = drive.getFiles(); 
  MailApp.getRemainingDailyQuota();
  console.log("Permissions granted.");
}

/**
 * HANDLE GET REQUESTS (For Direct Links in Emails)
 */
function doGet(e) {
  // Handle Direct Approve from Admin Email
  if (e.parameter && e.parameter.action === 'approve_order' && e.parameter.id) {
    return handleQuickApprove(e.parameter.id);
  }
  return ContentService.createTextOutput("Photo Moments API is running.");
}

/**
 * HANDLE POST REQUESTS (API)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    switch (action) {
      // PHOTOS
      case 'get_photos': result = getSheetData('Photos'); break;
      case 'save_photo': result = saveRow('Photos', data.photo); break;
      case 'update_photo': result = updateRow('Photos', data.id, data.updates); break;
      case 'delete_photo': result = deleteRow('Photos', data.id); break;
      case 'upload_file': result = uploadFileToDrive(data.fileData, data.fileName, data.mimeType); break;

      // SETTINGS
      case 'get_settings': result = getSettingsData(); break;
      case 'save_settings': result = saveSettingsData(data.settings); break;

      // ORDERS
      case 'get_orders': result = getSheetData('Orders'); break;
      case 'create_order': 
        result = saveRow('Orders', prepareOrderForSave(data.order)); 
        
        // Auto-send emails
        try {
           const appUrl = data.appUrl || 'https://photo-moments.vercel.app'; // Fallback
           // 1. Send Admin Alert
           sendAdminNotification({
             id: data.order.id,
             amount: data.order.total,
             customer: data.order.customerName,
             items: data.order.items,
             paymentMethod: data.order.paymentMethod,
             appUrl: appUrl
           });
           
           // 2. Send Customer Confirmation
           if (data.order.customerEmail) {
             sendOrderConfirmation(data.order, appUrl);
           }
        } catch(e) {
           console.error("Auto notify failed: " + e.toString());
        }
        break;
      case 'update_order': result = updateRow('Orders', data.id, data.updates); break;

      // PRODUCTS & INVENTORY
      case 'get_products': result = getSheetData('Products'); break;
      case 'save_product': result = saveRow('Products', data.product); break;
      case 'update_product': result = updateRow('Products', data.id, data.updates); break;
      case 'delete_product': result = deleteRow('Products', data.id); break;
      case 'get_inventory_logs': result = getSheetData('InventoryLogs'); break;
      case 'log_inventory': result = saveRow('InventoryLogs', data.log); break;

      // PARTNERS & STAMPS
      case 'get_partners': result = getSheetData('Partners'); break;
      case 'create_partner': result = saveRow('Partners', data.partner); break;
      case 'update_partner': result = updateRow('Partners', data.id, data.updates); break;
      case 'delete_partner': result = deleteRow('Partners', data.id); break;
      
      case 'get_stamps': result = getSheetData('Stamps'); break;
      case 'create_stamp': result = saveRow('Stamps', data.stamp); break;
      case 'delete_stamp': result = deleteRow('Stamps', data.id); break;

      // LEGACY EMAIL ACTIONS
      case 'notify_admin': result = sendAdminNotification(data); break;
      case 'send_link': result = sendCustomerLink(data); break;

      default: throw new Error("Unknown action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- LOGIC: QUICK APPROVE ---
function handleQuickApprove(orderId) {
  const result = updateRow('Orders', orderId, { status: 'paid' });
  let html = "";
  
  if (result.success) {
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Duyệt thành công</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { background-color: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #18181b; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #27272a; max-width: 90%; width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .icon { width: 64px; height: 64px; background: rgba(34, 197, 94, 0.2); color: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 32px; }
          h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          p { color: #a1a1aa; margin: 0; font-size: 16px; }
          .badge { background: #27272a; color: #fff; padding: 4px 12px; border-radius: 99px; font-family: monospace; font-size: 14px; margin-top: 16px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Đã duyệt thành công</h1>
          <p>Trạng thái đơn hàng đã được cập nhật thành 'PAID'.</p>
          <div class="badge">Order #${orderId}</div>
        </div>
      </body>
      </html>
    `;
  } else {
    html = `<h1>Lỗi: ${result.error}</h1>`;
  }
  
  return HtmlService.createHtmlOutput(html).setTitle('Approval Status').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- DATABASE HELPERS ---

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    let headers = [];
    if (name === 'Photos') headers = ['id', 'url', 'fileName', 'status', 'price', 'customerEmail', 'stampCode', 'createdAt'];
    if (name === 'Orders') headers = ['id', 'customerName', 'phone', 'email', 'address', 'items_json', 'uploaded_files_json', 'total', 'status', 'paymentMethod', 'createdAt'];
    // Added type, serviceCode, and extraPrice columns
    if (name === 'Products') headers = ['id', 'name', 'description', 'price', 'extraPrice', 'costPrice', 'stock', 'imageUrl', 'type', 'serviceCode', 'createdAt'];
    if (name === 'InventoryLogs') headers = ['id', 'productId', 'productName', 'changeAmount', 'currentStock', 'type', 'note', 'createdAt'];
    if (name === 'Partners') headers = ['id', 'code', 'name', 'businessName', 'phone', 'email', 'createdAt'];
    if (name === 'Stamps') headers = ['id', 'code', 'label', 'isUsed', 'createdAt'];
    if (name === 'Settings') headers = ['key', 'value'];
    
    if (headers.length > 0) sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    let row = rows[i];
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      let key = headers[j];
      let val = row[j];
      if ((key === 'items_json' || key === 'uploaded_files_json') && val) {
        try { val = JSON.parse(val); } catch(e) {}
        if (key === 'items_json') key = 'items';
        if (key === 'uploaded_files_json') key = 'uploadedFiles';
      }
      obj[key] = val;
    }
    data.push(obj);
  }
  return data;
}

function saveRow(sheetName, itemObj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];

  for (let header of headers) {
    let val = itemObj[header];
    if (header === 'items_json') val = JSON.stringify(itemObj.items || []);
    if (header === 'uploaded_files_json') val = JSON.stringify(itemObj.uploadedFiles || []);
    if (header === 'createdAt' && !val) val = new Date().toISOString();
    if (header === 'customerEmail' && itemObj.customer_email) val = itemObj.customer_email;
    if (header === 'fileName' && itemObj.file_name) val = itemObj.file_name;
    row.push(val === undefined ? '' : val);
  }
  sheet.appendRow(row);
  return itemObj;
}

function updateRow(sheetName, id, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIndex = headers.indexOf('id');
  
  if (idColIndex === -1) return { error: "No ID column" };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      for (let key in updates) {
        let colName = key;
        let val = updates[key];
        
        if (key === 'items') { colName = 'items_json'; val = JSON.stringify(val); }
        if (key === 'uploadedFiles') { colName = 'uploaded_files_json'; val = JSON.stringify(val); }

        const colIndex = headers.indexOf(colName);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(val);
        }
      }
      return { success: true };
    }
  }
  return { error: "ID not found" };
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const idColIndex = data[0].indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: "ID not found" };
}

function getSettingsData() {
  const sheet = getSheet('Settings');
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < rows.length; i++) {
    settings[rows[i][0]] = rows[i][1];
  }
  if (Object.keys(settings).length === 0) return null;
  if (settings.navigationItems) {
      try { settings.navigationItems = JSON.parse(settings.navigationItems); } catch(e) {}
  }
  return settings;
}

function saveSettingsData(newSettings) {
  const sheet = getSheet('Settings');
  sheet.clear();
  sheet.appendRow(['key', 'value']);
  for (let key in newSettings) {
    let val = newSettings[key];
    if (key === 'navigationItems') val = JSON.stringify(val);
    sheet.appendRow([key, val]);
  }
  return newSettings;
}

function prepareOrderForSave(order) {
  return {
    ...order,
    items_json: JSON.stringify(order.items),
    uploaded_files_json: JSON.stringify(order.uploadedFiles)
  };
}

function uploadFileToDrive(base64Data, fileName, mimeType) {
  try {
    const splitBase64 = base64Data.split(',');
    const dataPart = splitBase64.length > 1 ? splitBase64[1] : splitBase64[0];
    const bytes = Utilities.base64Decode(dataPart);
    const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName || 'file.dat');
    
    let folder;
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.trim() !== '') {
      try {
        folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      } catch (e) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w4000";
    return { url: url, id: file.getId() };
  } catch (e) {
    return { error: e.toString() };
  }
}

// --- EMAIL ENGINE (DARK THEME) ---

function getAdminEmail() {
  const settings = getSettingsData();
  return (settings && settings.adminNotificationEmail) ? settings.adminNotificationEmail : 'infor.photomoments@gmail.com';
}

function formatCurrency(amount) {
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}

/**
 * Generates a consistent, dark-themed HTML email structure
 */
function renderEmailTemplate(title, bodyContent, actionButtons = "") {
  const settings = getSettingsData();
  const brandName = settings?.logoText || "PHOTO MOMENTS";
  const logoUrl = settings?.logoImageUrl || ""; 

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; color: #ffffff; }
        .header { background-color: #18181b; padding: 30px 40px; border-bottom: 1px solid #27272a; text-align: center; }
        .header img { max-height: 40px; }
        .header h1 { margin: 10px 0 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; }
        .content { padding: 40px; line-height: 1.6; color: #d4d4d8; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #ffffff; }
        .highlight { color: #ffffff; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        .table th { text-align: left; color: #71717a; padding: 8px 0; border-bottom: 1px solid #27272a; font-size: 12px; text-transform: uppercase; }
        .table td { padding: 12px 0; border-bottom: 1px solid #27272a; color: #e4e4e7; }
        .table td.right { text-align: right; }
        .actions { padding: 0 40px 40px; text-align: center; }
        .btn { display: inline-block; padding: 14px 32px; border-radius: 99px; font-weight: bold; text-decoration: none; font-size: 14px; transition: all 0.2s; }
        .btn-primary { background-color: #ffffff; color: #000000; }
        .btn-success { background-color: #22c55e; color: #ffffff; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; background-color: #09090b; }
        a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
           ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}"/>` : `<h1>${brandName}</h1>`}
        </div>
        <div class="content">
          <div class="title">${title}</div>
          ${bodyContent}
        </div>
        ${actionButtons ? `<div class="actions">${actionButtons}</div>` : ''}
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.<br/>
          Automated email sent from Photo Moments System.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 1. Admin Notification (New Order)
 */
function sendAdminNotification(data) {
  try {
    const adminEmail = getAdminEmail();
    const scriptUrl = ScriptApp.getService().getUrl();
    const approveLink = `${scriptUrl}?action=approve_order&id=${data.id}`;
    
    // Build Item List
    let itemsHtml = '';
    if (data.items && data.items.length > 0) {
      itemsHtml = `<table class="table"><thead><tr><th>Sản phẩm</th><th class="right">Giá</th></tr></thead><tbody>`;
      data.items.forEach(item => {
        itemsHtml += `<tr><td>${item.name} <span style="color:#71717a">x${item.quantity}</span></td><td class="right">${formatCurrency(item.price * item.quantity)}</td></tr>`;
      });
      itemsHtml += `</tbody></table>`;
    }

    const content = `
      <p>Hệ thống vừa ghi nhận đơn hàng mới.</p>
      <div style="background:#27272a; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <div style="margin-bottom:8px; font-size:12px; color:#a1a1aa; text-transform:uppercase;">Mã đơn hàng</div>
        <div style="font-size:20px; color:#ffffff; font-family:monospace; font-weight:bold;">${data.id}</div>
        
        <div style="margin-top:16px; margin-bottom:8px; font-size:12px; color:#a1a1aa; text-transform:uppercase;">Khách hàng</div>
        <div style="color:#ffffff;">${data.customer || 'Khách lẻ'}</div>

        <div style="margin-top:16px; margin-bottom:8px; font-size:12px; color:#a1a1aa; text-transform:uppercase;">Phương thức thanh toán</div>
        <div style="color:#ffffff;">${data.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
      </div>
      ${itemsHtml}
      <div style="text-align:right; font-size:18px; font-weight:bold; margin-top:20px;">
        Tổng cộng: <span style="color:#22c55e">${formatCurrency(data.amount)}</span>
      </div>
    `;

    const actions = `
      <a href="${approveLink}" class="btn btn-success" style="margin-right:10px;">✓ DUYỆT ĐƠN NGAY</a>
      <a href="${data.appUrl || '#'}/#/admin" class="btn btn-primary" style="background:#3f3f46; color:#fff;">Vào Admin</a>
    `;

    const body = renderEmailTemplate(`Đơn Hàng Mới: ${data.id}`, content, actions);
    
    MailApp.sendEmail({
      to: adminEmail,
      subject: `[New Order] ${data.id} - ${formatCurrency(data.amount)}`,
      htmlBody: body,
      name: "Photo Moments System"
    });
    return { sent: true };
  } catch (e) {
    console.error("Failed to send admin email: " + e.toString());
    return { sent: false, error: e.toString() };
  }
}

/**
 * 2. Customer Confirmation (Invoice / Access Link)
 */
function sendOrderConfirmation(order, appUrl) {
  if (!order.customerEmail) return { sent: false };
  
  try {
    const lookupLink = `${appUrl}/#/lookup?id=${order.id}`;
    
    let itemsHtml = `<table class="table"><thead><tr><th>Sản phẩm</th><th class="right">Thành tiền</th></tr></thead><tbody>`;
    if (order.items) {
      order.items.forEach(item => {
        itemsHtml += `<tr><td>${item.name} <span style="color:#71717a">x${item.quantity}</span></td><td class="right">${formatCurrency(item.price * item.quantity)}</td></tr>`;
      });
    }
    itemsHtml += `</tbody></table>`;

    const content = `
      <p>Cảm ơn bạn đã sử dụng dịch vụ tại Photo Moments. Dưới đây là thông tin chi tiết đơn hàng của bạn.</p>
      
      ${itemsHtml}
      
      <div style="display:flex; justify-content:space-between; border-top:1px solid #3f3f46; padding-top:20px; margin-top:10px;">
        <span style="color:#a1a1aa;">Tổng thanh toán</span>
        <span style="font-size:20px; font-weight:bold; color:#ffffff;">${formatCurrency(order.total)}</span>
      </div>

      <p style="margin-top:30px; font-size:13px; color:#a1a1aa;">
        Trạng thái: <span style="color:${order.status === 'paid' ? '#22c55e' : '#eab308'}; font-weight:bold;">${order.status === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHỜ XỬ LÝ'}</span>
      </p>
    `;

    const actions = `
      <a href="${lookupLink}" class="btn btn-primary">XEM ĐƠN HÀNG / TẢI ẢNH</a>
    `;

    const body = renderEmailTemplate('Xác Nhận Đơn Hàng', content, actions);

    MailApp.sendEmail({
      to: order.customerEmail,
      subject: `[Photo Moments] Xác nhận đơn hàng #${order.id}`,
      htmlBody: body,
      name: "Photo Moments"
    });
    return { sent: true };
  } catch (e) {
    console.error("Failed customer email: " + e.toString());
    return { sent: false };
  }
}

/**
 * 3. Legacy / Manual Link Email
 */
function sendCustomerLink(data) {
  if (!data.customerEmail) return { sent: false, error: "No email" };
  const content = `
    <p>Link tải ảnh hoặc xem đơn hàng của bạn đã sẵn sàng.</p>
    <div style="background:#27272a; padding:15px; border-radius:8px; margin:20px 0;">
       Mã giao dịch: <strong style="color:#fff">${data.id}</strong>
    </div>
  `;
  const actions = `<a href="${data.downloadUrl}" class="btn btn-primary">XEM CHI TIẾT</a>`;
  const body = renderEmailTemplate('Thông Tin Giao Dịch', content, actions);
  
  try {
    MailApp.sendEmail({
      to: data.customerEmail,
      subject: `[Photo Moments] Thông tin giao dịch ${data.id}`,
      htmlBody: body,
      name: "Photo Moments"
    });
    return { sent: true };
  } catch(e) { return { sent: false }; }
}
