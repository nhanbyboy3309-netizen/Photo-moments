
import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Upload, Check, Download, Loader2, X, Edit2, FileImage, QrCode, ScanLine, Camera } from 'lucide-react';
import { generatePhotoId, savePhoto, uploadFile } from '../../services/mockBackend'; // Import uploadFile
import { Photo, SiteSettings } from '../../types';
import { generateQRCard } from '../../utils/adminHelpers';
// @ts-ignore
import { Html5Qrcode } from "html5-qrcode";

interface UploadTabProps {
  settings: SiteSettings | null;
  onPhotoUploaded: () => void;
  baseUrl: string;
}

interface UploadItem {
  file: File;
  id: string; 
  stampCode: string; 
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  previewUrl: string;
}

const UploadTab = memo(({ settings, onPhotoUploaded, baseUrl }: UploadTabProps) => {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBatch, setLastBatch] = useState<UploadItem[]>([]); 

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanIndex, setActiveScanIndex] = useState<number | null>(null);
  const scannerRef = useRef<any>(null);

  // ... (Scanner logic remains identical, omitted for brevity but assumed present in full file) ...
  useEffect(() => {
    let isMounted = true;
    const elementId = "upload-scanner";
    const cleanupScanner = async () => {
        if (scannerRef.current) {
            try {
                if(scannerRef.current.isScanning) await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (error) { console.warn(error); }
            scannerRef.current = null;
        }
    };
    if (isScanning && activeScanIndex !== null) {
        const timer = setTimeout(async () => {
            if (!isMounted) return;
            await cleanupScanner();
            const element = document.getElementById(elementId);
            if (!element) return;
            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;
            try {
                await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, 
                    (decodedText: string) => {
                         if (!isMounted) return;
                         handleStampCodeChange(activeScanIndex, decodedText);
                         html5QrCode.stop().then(() => {
                             html5QrCode.clear();
                             if(isMounted) { setIsScanning(false); setActiveScanIndex(null); }
                         }).catch(console.error);
                    },
                    () => {}
                );
            } catch (err) { if (isMounted) setIsScanning(false); }
        }, 100);
        return () => clearTimeout(timer);
    } else { cleanupScanner(); }
    return () => { isMounted = false; cleanupScanner(); }
  }, [isScanning, activeScanIndex]);

  const startScan = (index: number) => { if(isScanning) return; setActiveScanIndex(index); setIsScanning(true); };
  const stopScan = () => { setIsScanning(false); setActiveScanIndex(null); };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      const startId = await generatePhotoId(); 
      const baseIdNum = parseInt(startId.slice(-3)); 
      const prefix = startId.slice(0, -3);

      const newItems: UploadItem[] = newFiles.map((file, index) => {
        const nextNum = baseIdNum + index;
        const formattedId = `${prefix}${String(nextNum).padStart(3, '0')}`;
        return { file, id: formattedId, stampCode: '', status: 'idle', previewUrl: URL.createObjectURL(file) };
      });
      setUploadQueue(prev => [...prev, ...newItems]);
      e.target.value = '';
    }
  }, []);

  const handleRemoveItem = (index: number) => {
    setUploadQueue(prev => {
      const newQ = [...prev];
      URL.revokeObjectURL(newQ[index].previewUrl);
      newQ.splice(index, 1);
      return newQ;
    });
  };

  const handleIdChange = (index: number, newId: string) => {
    setUploadQueue(prev => { const newQ = [...prev]; newQ[index].id = newId; return newQ; });
  };

  const handleStampCodeChange = (index: number, newCode: string) => {
    setUploadQueue(prev => { const newQ = [...prev]; newQ[index].stampCode = newCode; return newQ; });
  };

  const handleUploadAll = async () => {
    if (!settings) return;
    setIsProcessing(true);
    setLastBatch([]); 

    const completedItems: UploadItem[] = [];

    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      setUploadQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it));

      try {
        if (item.file.size > 20 * 1024 * 1024) throw new Error("File too large (> 20MB)");

        // 1. Upload to GAS (Drive) via helper
        const publicUrl = await uploadFile(item.file);
        if (!publicUrl) throw new Error("Upload failed");

        // 2. Save DB Record to Sheets
        const newPhoto: Photo = {
          id: item.id,
          url: publicUrl,
          fileName: item.file.name,
          createdAt: new Date().toISOString(),
          status: 'unpaid',
          price: settings.photoPrice,
          stampCode: item.stampCode
        };

        await savePhoto(newPhoto);

        const successItem: UploadItem = { ...item, status: 'success' };
        completedItems.push(successItem);
        setUploadQueue(prev => prev.map((it, idx) => idx === i ? successItem : it));

      } catch (error: any) {
        console.error(`Error uploading ${item.id}:`, error);
        setUploadQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: error.message } : it));
      }
    }

    onPhotoUploaded();
    setIsProcessing(false);
    setLastBatch(completedItems);
    setUploadQueue(prev => prev.filter(i => i.status !== 'success' && i.status !== 'uploading'));
  };

  const downloadQRCard = async (item: UploadItem) => {
    try {
        const qrLink = `${baseUrl}#/view/${item.id}`;
        const cardDataUrl = await generateQRCard(qrLink, item.id, settings?.watermarkImageUrl, settings?.logoText);
        const link = document.createElement('a');
        link.href = cardDataUrl;
        link.download = `QR_CARD_${item.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) { console.error(e); alert("Could not generate QR Card."); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 animate-fade-in relative">
      {isScanning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden relative">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                       <h3 className="font-bold text-white flex items-center gap-2"><ScanLine className="w-5 h-5"/> Quét mã Stamp</h3>
                       <button onClick={stopScan} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-4"><div id="upload-scanner" className="w-full bg-black rounded-lg overflow-hidden border border-zinc-800"></div></div>
              </div>
          </div>
      )}

      <div className="space-y-6">
        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-10 text-center hover:border-zinc-600 hover:bg-zinc-900/50 transition-all relative cursor-pointer group">
          <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="group-hover:scale-110 transition-transform duration-300"><Upload className="w-12 h-12 text-zinc-600 group-hover:text-white mx-auto mb-4" /></div>
          <p className="text-lg font-medium text-white">Click or Drag photos here</p>
          <p className="text-zinc-500 text-sm mt-2">Multiple upload supported. Files saved to Google Drive.</p>
        </div>

        {uploadQueue.length > 0 && (
            <div className="space-y-3">
                <div className="flex justify-between items-center text-zinc-400 text-sm px-2">
                    <span>Pending ({uploadQueue.length})</span>
                    <button onClick={() => setUploadQueue([])} disabled={isProcessing} className="text-red-500 hover:text-red-400">Clear All</button>
                </div>
                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {uploadQueue.map((item, index) => (
                        <div key={index} className={`bg-zinc-900 p-3 rounded-xl flex items-center gap-4 border ${item.status === 'error' ? 'border-red-500/50' : 'border-zinc-800'}`}>
                            <div className="w-16 h-16 bg-black rounded overflow-hidden shrink-0"><img src={item.previewUrl} className="w-full h-full object-cover" alt="" /></div>
                            <div className="flex-1 min-w-0 grid gap-2">
                                <div className="flex items-center gap-2">
                                    <Edit2 className="w-3 h-3 text-zinc-600" />
                                    <input type="text" value={item.id} onChange={(e) => handleIdChange(index, e.target.value)} disabled={isProcessing} className="bg-transparent border-b border-zinc-700 text-white text-sm font-mono w-full focus:outline-none" placeholder="Photo ID" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <QrCode className="w-3 h-3 text-zinc-600" />
                                    <div className="flex-1 flex gap-1">
                                        <input type="text" value={item.stampCode} onChange={(e) => handleStampCodeChange(index, e.target.value)} disabled={isProcessing} className="bg-transparent border-b border-zinc-700 text-green-400 text-sm font-mono w-full focus:outline-none uppercase" placeholder="Stamp Code" />
                                        <button type="button" onClick={() => startScan(index)} className="text-zinc-400 hover:text-white"><Camera className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
                            </div>
                            <div className="shrink-0 flex flex-col items-center gap-2">
                                {item.status === 'uploading' ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <button onClick={() => handleRemoveItem(index)} disabled={isProcessing} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>}
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={handleUploadAll} disabled={isProcessing} className="w-full bg-white text-black py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Start Upload (${uploadQueue.length})`}
                </button>
            </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Check className="w-5 h-5 text-green-500" /> Uploaded Successfully</h3>
        {lastBatch.length === 0 ? (
            <div className="h-64 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600">
                <FileImage className="w-10 h-10 mb-2 opacity-50" /><p>No recently uploaded photos</p>
            </div>
        ) : (
            <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {lastBatch.map((item, idx) => (
                    <div key={idx} className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <img src={item.previewUrl} className="w-16 h-16 object-cover rounded-lg border border-green-500/30" alt="" />
                            <div>
                                <p className="text-white font-bold font-mono text-lg">{item.id}</p>
                                {item.stampCode && <p className="text-zinc-400 text-xs font-mono">Stamp: {item.stampCode}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => downloadQRCard(item)} className="bg-white text-black px-3 py-2 rounded-lg text-xs font-bold hover:bg-zinc-200 flex items-center justify-center gap-2"><QrCode className="w-4 h-4" /> QR</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
});

export default UploadTab;
