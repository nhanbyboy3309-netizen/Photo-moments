
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const cors = require('cors');
const fetch = require('node-fetch');
const sharp = require('sharp');

// --- POLYFILL FETCH FOR NODE < 18 ---
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

const app = express();
const PORT = process.env.PORT || 8080;

// GAS URL (Must match the deployed Web App URL from Google Apps Script)
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjgO1tBe-yZpA1_MRJuoPJyqY6PUffYzFSnDMG-KtkgvgNSzWzIUZoq3mXneOw3nfZ0A/exec";

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

// 1. SILENT ID CARD PRINTING (bypasses the browser print dialog)
// Composes the front/back card images into the same A4/A5 sheet layout the
// browser dialog mode prints, then sends it straight to the named Windows
// printer with `mspaint /pt` — no dialog, no manual "Print" click.
const DPI = 300;
const mmToPx = (v) => Math.round((v * DPI) / 25.4);
const ID_CARD_W = mmToPx(85.6);
const ID_CARD_H = mmToPx(53.98);
const A4_W = mmToPx(210);
const A4_H = mmToPx(297);
const A5_W = mmToPx(210); // landscape
const A5_H = mmToPx(148);

async function fetchImageBuffer(url) {
    if (!/^https?:\/\//i.test(url)) {
        throw new Error('Ảnh chưa được tải lên máy chủ lưu trữ (chưa có URL http/https), không thể in thẳng.');
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Không tải được ảnh thẻ (HTTP ${r.status}).`);
    return Buffer.from(await r.arrayBuffer());
}

async function buildCardBuffer(url) {
    const raw = await fetchImageBuffer(url);
    return sharp(raw).resize(ID_CARD_W, ID_CARD_H, { fit: 'cover' }).png().toBuffer();
}

async function buildSheetBuffer(width, height, placements) {
    return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
        .composite(placements.map(p => ({ input: p.buf, left: p.left, top: p.top })))
        .png()
        .toBuffer();
}

function printFileToPrinter(filePath, printerName) {
    return new Promise((resolve, reject) => {
        execFile('mspaint.exe', ['/pt', filePath, printerName], { timeout: 20000 }, (err) => {
            if (err) reject(new Error('Không gửi được lệnh in tới máy in (kiểm tra tên máy in và mspaint.exe).'));
            else resolve();
        });
    });
}

app.post('/api/print-idcard', async (req, res) => {
    if (process.platform !== 'win32') {
        return res.status(400).json({ success: false, message: 'Chế độ in thẳng qua Server chỉ hỗ trợ máy Windows.' });
    }

    const { printerName, layout, copies, frontImageUrl, backImageUrl } = req.body;
    const n = Math.max(1, Math.min(20, parseInt(copies, 10) || 1));
    if (!printerName || !frontImageUrl || !backImageUrl) {
        return res.status(400).json({ success: false, message: 'Thiếu tên máy in hoặc ảnh mặt trước/sau.' });
    }

    const tmpFiles = [];
    try {
        const [frontBuf, backBuf] = await Promise.all([
            buildCardBuffer(frontImageUrl),
            buildCardBuffer(backImageUrl)
        ]);

        const gap = mmToPx(10);
        const top15 = mmToPx(15);
        const side15 = mmToPx(15);

        const sheets = [];
        if (layout === 'A5_2Sides') {
            sheets.push(await buildSheetBuffer(A5_W, A5_H, [{ buf: frontBuf, left: A5_W - side15 - ID_CARD_W, top: top15 }]));
            sheets.push(await buildSheetBuffer(A5_W, A5_H, [{ buf: backBuf, left: side15, top: top15 }]));
        } else {
            const marginLR = Math.round((A4_W - (ID_CARD_W * 2 + gap)) / 2);
            sheets.push(await buildSheetBuffer(A4_W, A4_H, [
                { buf: frontBuf, left: marginLR, top: top15 },
                { buf: backBuf, left: marginLR + ID_CARD_W + gap, top: top15 }
            ]));
        }

        for (const sheetBuf of sheets) {
            const tmpFile = path.join(os.tmpdir(), `pm_idcard_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
            fs.writeFileSync(tmpFile, sheetBuf);
            tmpFiles.push(tmpFile);
        }

        for (let c = 0; c < n; c++) {
            for (const tmpFile of tmpFiles) {
                await printFileToPrinter(tmpFile, printerName);
            }
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message || 'In thất bại.' });
    } finally {
        tmpFiles.forEach(f => fs.unlink(f, () => {}));
    }
});

// Serve React App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
