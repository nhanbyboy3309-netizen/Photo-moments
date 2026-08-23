
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

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

// Serve React App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
