
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
// Raised from the 100kb default: silent print jobs can carry several
// base64-encoded PDF page renders (from pdfjs canvas output) in one request.
app.use(express.json({ limit: '50mb' }));
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

// 1. SILENT PRINTING (bypasses the browser print dialog) — used by both
// "In Tài Liệu" (documents) and "In Căn Cước" (ID cards). Composes the
// page(s) into the same sheet layout the dialog mode prints, then sends the
// result straight to the named Windows printer with `mspaint /pt`.
const DPI = 300;
const mmToPx = (v) => Math.round((v * DPI) / 25.4);
const ID_CARD_W = mmToPx(85.6);
const ID_CARD_H = mmToPx(53.98);
const A4_W = mmToPx(210);
const A4_H = mmToPx(297);
const A5_LANDSCAPE_W = mmToPx(210);
const A5_LANDSCAPE_H = mmToPx(148);

const PAPER_SIZES_PX = {
    A4: { w: A4_W, h: A4_H },
    A3: { w: mmToPx(297), h: mmToPx(420) },
    A5: { w: mmToPx(148), h: mmToPx(210) }
};

// Accepts either an http(s) URL (fetched server-side, no CORS involved) or
// an inline data: URL (e.g. a PDF page already rasterized in the browser).
async function resolveImageBuffer(src) {
    if (typeof src !== 'string') throw new Error('Nguồn ảnh không hợp lệ để in.');
    const dataMatch = /^data:image\/\w+;base64,(.+)$/i.exec(src);
    if (dataMatch) return Buffer.from(dataMatch[1], 'base64');
    if (/^https?:\/\//i.test(src)) {
        const r = await fetch(src);
        if (!r.ok) throw new Error(`Không tải được ảnh (HTTP ${r.status}).`);
        return Buffer.from(await r.arrayBuffer());
    }
    throw new Error('Ảnh chưa được tải lên máy chủ lưu trữ (chưa có URL http/https), không thể in thẳng.');
}

async function buildCardBuffer(src) {
    const raw = await resolveImageBuffer(src);
    return sharp(raw).resize(ID_CARD_W, ID_CARD_H, { fit: 'cover' }).png().toBuffer();
}

async function buildSheetBuffer(width, height, placements) {
    return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
        .composite(placements.map(p => ({ input: p.buf, left: p.left, top: p.top })))
        .png()
        .toBuffer();
}

// Tiles up to `cols x rows` images onto one page, each letterboxed to fit
// its cell (mirrors the dialog mode's `object-fit: contain` grid CSS).
async function composeGridSheet(pageW, pageH, imgBuffers, cols, rows) {
    const cellW = Math.floor(pageW / cols);
    const cellH = Math.floor(pageH / rows);
    const placements = await Promise.all(imgBuffers.map(async (buf, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const fitted = await sharp(buf)
            .resize(cellW, cellH, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
            .png()
            .toBuffer();
        return { buf: fitted, left: col * cellW, top: row * cellH };
    }));
    return buildSheetBuffer(pageW, pageH, placements);
}

function printFileToPrinter(filePath, printerName) {
    return new Promise((resolve, reject) => {
        execFile('mspaint.exe', ['/pt', filePath, printerName], { timeout: 20000 }, (err) => {
            if (err) reject(new Error('Không gửi được lệnh in tới máy in (kiểm tra tên máy in và mspaint.exe).'));
            else resolve();
        });
    });
}

function writeTmpSheet(prefix, buf, tmpFiles) {
    const tmpFile = path.join(os.tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
    fs.writeFileSync(tmpFile, buf);
    tmpFiles.push(tmpFile);
    return tmpFile;
}

// Lists the printers actually installed on this machine (Windows only) so
// the admin picks a real device instead of guessing a name.
app.get('/api/printers', (req, res) => {
    if (process.platform !== 'win32') {
        return res.json({ success: true, printers: [] });
    }
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name'], { timeout: 10000 }, (err, stdout) => {
        if (err) {
            return res.json({ success: false, printers: [], message: 'Không lấy được danh sách máy in từ hệ thống.' });
        }
        const printers = String(stdout).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        res.json({ success: true, printers });
    });
});

// General document silent printing — mirrors PrintDocument.tsx's dialog-mode
// page layout (paperSize + pagesPerSheet grid + copies), per uploaded file.
app.post('/api/print-document', async (req, res) => {
    if (process.platform !== 'win32') {
        return res.status(400).json({ success: false, message: 'Chế độ in thẳng qua Server chỉ hỗ trợ máy Windows.' });
    }

    const { printerName, files } = req.body;
    if (!printerName || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, message: 'Thiếu tên máy in hoặc danh sách trang in.' });
    }

    const tmpFiles = [];
    try {
        for (const file of files) {
            const paperPx = PAPER_SIZES_PX[file.paperSize] || PAPER_SIZES_PX.A4;
            const perSheet = [1, 2, 4].includes(file.pagesPerSheet) ? file.pagesPerSheet : 1;
            const cols = perSheet === 4 ? 2 : 1;
            const rows = perSheet === 1 ? 1 : 2;
            const copies = Math.max(1, Math.min(50, parseInt(file.copies, 10) || 1));
            const images = Array.isArray(file.images) ? file.images : [];
            if (images.length === 0) continue;

            const chunks = [];
            for (let i = 0; i < images.length; i += perSheet) chunks.push(images.slice(i, i + perSheet));

            for (let c = 0; c < copies; c++) {
                for (const chunk of chunks) {
                    const buffers = await Promise.all(chunk.map(resolveImageBuffer));
                    const sheetBuf = await composeGridSheet(paperPx.w, paperPx.h, buffers, cols, rows);
                    const tmpFile = writeTmpSheet('pm_doc', sheetBuf, tmpFiles);
                    await printFileToPrinter(tmpFile, printerName);
                }
            }
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message || 'In thất bại.' });
    } finally {
        tmpFiles.forEach(f => fs.unlink(f, () => {}));
    }
});

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
            sheets.push(await buildSheetBuffer(A5_LANDSCAPE_W, A5_LANDSCAPE_H, [{ buf: frontBuf, left: A5_LANDSCAPE_W - side15 - ID_CARD_W, top: top15 }]));
            sheets.push(await buildSheetBuffer(A5_LANDSCAPE_W, A5_LANDSCAPE_H, [{ buf: backBuf, left: side15, top: top15 }]));
        } else {
            const marginLR = Math.round((A4_W - (ID_CARD_W * 2 + gap)) / 2);
            sheets.push(await buildSheetBuffer(A4_W, A4_H, [
                { buf: frontBuf, left: marginLR, top: top15 },
                { buf: backBuf, left: marginLR + ID_CARD_W + gap, top: top15 }
            ]));
        }

        const tmpSheetFiles = sheets.map(sheetBuf => writeTmpSheet('pm_idcard', sheetBuf, tmpFiles));

        for (let c = 0; c < n; c++) {
            for (const tmpFile of tmpSheetFiles) {
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
