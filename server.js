
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// --- POLYFILL FETCH FOR NODE < 18 ---
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

const app = express();
const PORT = process.env.PORT || 8080;

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// GAS URL (Must match the deployed Web App URL from Google Apps Script)
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjgO1tBe-yZpA1_MRJuoPJyqY6PUffYzFSnDMG-KtkgvgNSzWzIUZoq3mXneOw3nfZ0A/exec";

// Check configuration
const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id');

// Initialize Supabase
let supabase;
if (isSupabaseConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
} else {
  console.warn("⚠️ WARNING: Supabase keys not set in server.js. Database features will fail.");
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// --- API ROUTES ---

// In-memory store for session print files (temporary, fast, system-wide real-time upload/sync)
const sessionFilesStore = {};

// 0. SESSION FILES APIs FOR REAL-TIME PRINT SYNC
app.post('/api/session-files', (req, res) => {
    const { sessionId, name, url, size } = req.body;
    if (!sessionId || !url) {
        return res.status(400).json({ success: false, message: "Missing sessionId or url" });
    }
    
    if (!sessionFilesStore[sessionId]) {
        sessionFilesStore[sessionId] = [];
    }
    
    const newFile = {
        id: 'FL' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        name: name || 'Document',
        url: url,
        size: size || 0,
        uploadedAt: new Date().toISOString()
    };
    
    // Avoid exact duplicate URLs within the same session
    const exists = sessionFilesStore[sessionId].some(f => f.url === url);
    if (!exists) {
        sessionFilesStore[sessionId].push(newFile);
    }
    
    res.json({ success: true, file: newFile });
});

app.get('/api/session-files/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const files = sessionFilesStore[sessionId] || [];
    res.json({ success: true, files });
});

app.delete('/api/session-files/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    delete sessionFilesStore[sessionId];
    res.json({ success: true });
});

// 1. CONFIRM PHOTO PAYMENT (For single photo view flow)
app.get('/api/confirm-payment', async (req, res) => {
    const { photoId } = req.query;
    if (!photoId) return res.status(400).send("Missing photoId");
    if (!isSupabaseConfigured || !supabase) return res.status(500).send("Database not configured.");

    const { data: photo, error: fetchError } = await supabase.from('photos').select('*').eq('id', photoId).single();
    if (fetchError || !photo) return res.send(`<h1 style='color:red'>Lỗi: Không tìm thấy ảnh ID ${photoId}</h1>`);
    if (photo.status === 'paid') return res.send(`<h1 style='color:green'>Giao dịch này đã được xác nhận trước đó!</h1>`);

    await supabase.from('photos').update({ status: 'paid' }).eq('id', photoId);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    // Bổ sung &download=true
    const viewPageUrl = `${protocol}://${host}/#/view/${photo.id}?payment_success=true&download=true`;

    try {
        await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "send_link",
                id: photo.id,
                amount: photo.price,
                customerEmail: photo.customer_email,
                downloadUrl: viewPageUrl 
            })
        });
    } catch (e) { console.error(e); }

    res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Confirmed</title><style>body { background-color: #000; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }.box { background: #111; border: 1px solid #333; padding: 40px; border-radius: 12px; text-align: center; }.btn { display: inline-block; background: #fff; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }</style></head>
    <body><div class="box"><h1 style="color:#22c55e">XÁC NHẬN THÀNH CÔNG</h1><p>Ảnh <strong>${photoId}</strong> đã được kích hoạt.</p><a href="/" class="btn">Về Trang Chủ</a></div></body>
    </html>`);
});

// 2. NEW: CONFIRM ORDER PAYMENT (For Cart/Online Orders)
app.get('/api/confirm-order-payment', async (req, res) => {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).send("Missing orderId");
    if (!isSupabaseConfigured || !supabase) return res.status(500).send("Database not configured.");

    // 1. Fetch Order
    const { data: order, error: fetchError } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (fetchError || !order) return res.send(`<h1 style='color:red'>Lỗi: Không tìm thấy đơn hàng ${orderId}</h1>`);
    if (order.status === 'paid') return res.send(`<h1 style='color:green'>Đơn hàng này đã được xác nhận trước đó!</h1>`);

    // 2. Update Order Status
    const { error: updateError } = await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
    if (updateError) return res.status(500).send("Lỗi cập nhật trạng thái đơn hàng.");

    // 3. Deduct Inventory
    if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
            try {
                const { data: product } = await supabase.from('products').select('stock, name').eq('id', item.id).single();
                if (product) {
                    const newStock = Math.max(0, product.stock - (item.quantity || 1));
                    await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                    
                    // Log Inventory
                    await supabase.from('inventory_logs').insert([{
                        product_id: item.id,
                        product_name: product.name,
                        change_amount: -(item.quantity || 1),
                        current_stock: newStock,
                        type: 'export',
                        note: `Xác nhận thanh toán đơn #${orderId}`,
                        created_at: new Date().toISOString()
                    }]);
                }
            } catch (invErr) { console.error("Inventory deduction error", invErr); }
        }
    }

    // 4. Trigger Customer Email
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const lookupUrl = `${protocol}://${host}/#/lookup?id=${orderId}`;

    try {
        await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "send_link",
                id: orderId,
                amount: order.total,
                customerEmail: order.customer_email,
                downloadUrl: lookupUrl 
            })
        });
    } catch (e) { console.error("GAS error", e); }

    res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Order Confirmed</title><style>body { background-color: #000; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }.box { background: #111; border: 1px solid #333; padding: 40px; border-radius: 12px; text-align: center; }.btn { display: inline-block; background: #fff; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }</style></head>
    <body><div class="box"><h1 style="color:#22c55e">XÁC NHẬN ĐƠN HÀNG THÀNH CÔNG</h1><p>Đơn hàng <strong>${orderId}</strong> đã được thanh toán.</p><p>Hệ thống đã gửi email thông báo cho khách hàng.</p><a href="/" class="btn">Về Trang Chủ</a></div></body>
    </html>`);
});

// Serve React App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
