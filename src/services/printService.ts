
import { uploadFile } from './mockBackend'; // Changed import

// @ts-ignore
const pdfjs = require('pdfjs-dist');

const pdfjsLib: any = (pdfjs as any).getDocument ? pdfjs : (pdfjs as any).default;

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface FilePageInfo {
  fileName: string;
  fileType: string;
  totalPages: number;
}

export interface PrintConfig {
  paperSize: 'A5' | 'A4' | 'A3';
  sides: '1' | '2';
  pagesPerSheet: 1 | 2 | 4 | 6;
  copies: number;
  totalPages: number;
  pageRangeStart: number;
  pageRangeEnd: number;
}

export interface PrintFile {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  config: PrintConfig;
  isAnalyzing?: boolean;
}

const analyzeArrayBuffer = async (arrayBuffer: ArrayBuffer, fileName: string): Promise<FilePageInfo> => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (extension.match(/(jpg|jpeg|png|webp|gif)$/)) return { fileName, fileType: 'Image', totalPages: 1 };
    if (extension === 'pdf') {
        try {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            return { fileName, fileType: 'PDF', totalPages: pdf.numPages };
        } catch (e) { return { fileName, fileType: 'PDF', totalPages: 1 }; }
    }
    // Simple mock for office files as JSZip might be heavy or complex to fully robustly parse in browser without lib
    // Assuming 1 page for office files if deep parse fails
    return { fileName, fileType: extension.toUpperCase(), totalPages: 1 };
};

export const countFilePagesFromUrl = async (url: string, fileName: string): Promise<FilePageInfo> => {
    try {
        // Note: Fetching from Drive/GAS url might have CORS issues if not configured publicly
        const response = await fetch(url, { mode: 'cors' }); 
        const arrayBuffer = await response.arrayBuffer();
        return analyzeArrayBuffer(arrayBuffer, fileName);
    } catch (e) { return { fileName, fileType: 'Error', totalPages: 1 }; }
};

export const uploadPrintFile = async (file: File, sessionId: string): Promise<string | null> => {
  try {
    const url = await uploadFile(file);
    if (url) {
      // Send file metadata to Node.js server
      const response = await fetch('/api/session-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          name: file.name,
          url: url,
          size: file.size
        })
      });
      if (response.ok) {
        return url;
      }
    }
    return null;
  } catch (error) {
    console.error("uploadPrintFile error:", error);
    return null;
  }
};

export const calculateSheetsPerCopy = (file: PrintFile): number => {
    const pagesInSelection = Math.max(0, (file.config.pageRangeEnd - file.config.pageRangeStart) + 1);
    if (pagesInSelection === 0) return 0;
    const facesNeeded = Math.ceil(pagesInSelection / file.config.pagesPerSheet);
    return file.config.sides === '2' ? Math.ceil(facesNeeded / 2) : facesNeeded;
};

export const calculatePrintCost = (file: PrintFile, priceA4: number = 1000, priceA3: number = 3000): number => {
  let unitPrice = priceA4;
  if (file.config.paperSize === 'A3') unitPrice = priceA3;
  if (file.config.paperSize === 'A5') unitPrice = Math.max(500, priceA4 * 0.6);
  return calculateSheetsPerCopy(file) * unitPrice * file.config.copies;
};

export const getSessionFiles = async (sessionId: string): Promise<PrintFile[]> => {
  try {
    const res = await fetch(`/api/session-files/${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.files) {
        return data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          size: file.size,
          uploadedAt: file.uploadedAt,
          isAnalyzing: file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().match(/\.(docx|xlsx|pptx)$/) !== null,
          config: {
            paperSize: 'A4',
            sides: '1',
            pagesPerSheet: 1,
            copies: 1,
            totalPages: 1,
            pageRangeStart: 1,
            pageRangeEnd: 1
          }
        }));
      }
    }
  } catch (e) {
    console.error("getSessionFiles error:", e);
  }
  return []; 
};

export const renderPdfToImages = async (url: string, start: number, end: number): Promise<string[]> => {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const images: string[] = [];
        for (let i = start; i <= Math.min(end, pdf.numPages); i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); 
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const context = canvas.getContext('2d');
            if (context) {
                await page.render({ canvasContext: context, viewport, canvas }).promise;
                images.push(canvas.toDataURL('image/jpeg', 0.95));
            }
        }
        return images;
    } catch (e) { throw e; }
};

export const cleanupSession = async (sessionId: string) => {
  try {
    await fetch(`/api/session-files/${sessionId}`, { method: 'DELETE' });
  } catch (error) {
    console.error("cleanupSession error:", error);
  }
};
