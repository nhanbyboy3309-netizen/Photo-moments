
import React, { memo, useState, useRef, useEffect } from 'react';
import { Mail, Check, RefreshCw, Download, QrCode, Search, Trash2, Edit3, X, Save, Loader2, Calendar, MoreHorizontal, ScanLine, Camera, Ticket } from 'lucide-react';
import { Photo, SiteSettings } from '../../types';
import { formatCurrency, generateQRCard } from '../../utils/adminHelpers';
// @ts-ignore
import { Html5Qrcode } from "html5-qrcode";

interface GalleryTabProps {
  photos: Photo[];
  onUpdateStatus: (id: string, status: Photo['status']) => Promise<void>;
  onDelete: (id: string, fileName: string) => Promise<void>;
  onEdit: (id: string, updates: Partial<Photo>) => Promise<void>;
  baseUrl: string;
  settings: SiteSettings | null;
}

const GalleryTab = memo(({ photos, onUpdateStatus, onDelete, onEdit, baseUrl, settings }: GalleryTabProps) => {
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Scanner State for Edit Modal
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  // --- CAMERA SCANNER LOGIC ---
  useEffect(() => {
    let isMounted = true;

    if (isScanning) {
        setTimeout(() => {
            if (!isMounted) return;
            
            // Check if element exists
            const element = document.getElementById("gallery-scanner");
            if (!element) return;

            const html5QrCode = new Html5Qrcode("gallery-scanner");
            scannerRef.current = html5QrCode;
            
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText: string) => {
                    // On Success
                    if (!isMounted) return;
                    
                    // Use functional update to ensure we don't need 'editingPhoto' in deps
                    setEditingPhoto(prev => prev ? {...prev, stampCode: decodedText} : null);
                    
                    // Stop scanner immediately after success
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        if (isMounted) setIsScanning(false);
                    }).catch((err: any) => console.log("Stop failed", err));
                },
                (errorMessage: string) => { }
            ).catch((err: any) => {
                console.error("Error starting scanner", err);
                if (isMounted) {
                    setIsScanning(false);
                    alert("Không thể khởi động camera.");
                }
            });
        }, 100);
    }

    return () => {
        isMounted = false;
        if(scannerRef.current) {
             try {
                 if (scannerRef.current.isScanning) {
                     scannerRef.current.stop().then(() => scannerRef.current.clear()).catch((e:any) => console.log(e));
                 } else {
                     scannerRef.current.clear();
                 }
             } catch (e) {
                 // ignore cleanup errors
             }
        }
    };
  }, [isScanning]); // Removed editingPhoto dependency to prevent re-init loops


  const filteredPhotos = photos.filter(p => 
    p.id.toLowerCase().includes(search.toLowerCase()) || 
    (p.customerEmail && p.customerEmail.toLowerCase().includes(search.toLowerCase())) ||
    (p.stampCode && p.stampCode.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDownloadQRCard = async (photo: Photo) => {
    try {
        const qrLink = `${baseUrl}#/view/${photo.id}`;
        // Use the helper to generate the layout
        const cardDataUrl = await generateQRCard(
            qrLink, 
            photo.id, 
            settings?.watermarkImageUrl, 
            settings?.logoText
        );
        
        const link = document.createElement('a');
        link.href = cardDataUrl;
        link.download = `QR_CARD_${photo.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error generating card", e);
        alert("Could not generate QR Card.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;
    setIsSaving(true);
    try {
        await onEdit(editingPhoto.id, {
            customerEmail: editingPhoto.customerEmail,
            price: editingPhoto.price,
            status: editingPhoto.status,
            stampCode: editingPhoto.stampCode // include stamp code
        });
        setEditingPhoto(null);
    } catch (e) {
        console.error(e);
        alert("Update failed");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <>
    <div className="space-y-4">
        {/* Search Bar */}
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
            <Search className="w-5 h-5 text-zinc-500" />
            <input 
                type="text" 
                placeholder="Search by ID, Email, or Stamp Code..."
                className="bg-transparent border-none focus:ring-0 text-white w-full focus:outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        {/* 📱 MOBILE VIEW: Cards */}
        <div className="md:hidden space-y-4">
            {filteredPhotos.map(photo => (
                <div key={photo.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4 space-y-4">
                    <div className="flex gap-4">
                        <div className="w-20 h-20 bg-black rounded-lg overflow-hidden shrink-0 border border-zinc-800" onClick={() => setEditingPhoto(photo)}>
                            <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="text-white font-bold font-mono text-lg truncate">{photo.id}</h3>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                    photo.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    photo.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                    {photo.status}
                                </span>
                            </div>
                            <p className="text-zinc-500 text-xs mt-1 truncate">
                                {photo.customerEmail || 'No email'}
                            </p>
                            {photo.stampCode && (
                                <p className="text-green-500 font-mono text-xs mt-1 truncate">
                                    Stamp: {photo.stampCode}
                                </p>
                            )}
                            <p className="text-white font-bold text-sm mt-1">
                                {formatCurrency(photo.price || 50000)}
                            </p>
                        </div>
                    </div>
                    
                    {/* Mobile Actions */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800">
                         <button onClick={() => setEditingPhoto(photo)} className="bg-zinc-800 text-white p-2 rounded-lg flex justify-center"><Edit3 className="w-4 h-4"/></button>
                         {photo.status !== 'paid' && (
                            <button onClick={() => onUpdateStatus(photo.id, 'paid')} className="bg-green-600 text-white p-2 rounded-lg flex justify-center"><Check className="w-4 h-4"/></button>
                         )}
                         <button onClick={() => handleDownloadQRCard(photo)} className="bg-zinc-800 text-white p-2 rounded-lg flex justify-center"><QrCode className="w-4 h-4"/></button>
                         <button onClick={() => onDelete(photo.id, photo.fileName)} className="bg-red-900/30 text-red-500 p-2 rounded-lg flex justify-center"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
        </div>

        {/* 💻 DESKTOP VIEW: Table */}
        <div className="hidden md:block bg-zinc-900/30 rounded-2xl border border-zinc-800 overflow-hidden animate-fade-in overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-sm uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">ID</th>
                <th className="py-4 px-6 font-medium">Preview</th>
                <th className="py-4 px-6 font-medium">Stamp Code</th>
                <th className="py-4 px-6 font-medium">Customer Email</th>
                <th className="py-4 px-6 font-medium">Price</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">Actions</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
            {filteredPhotos.map(photo => (
                <tr key={photo.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="py-4 px-6 font-mono text-sm font-bold text-white">{photo.id}</td>
                <td className="py-4 px-6">
                    <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer" onClick={() => setEditingPhoto(photo)}>
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    </div>
                </td>
                <td className="py-4 px-6">
                    {photo.stampCode ? (
                        <span className="font-mono text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs border border-green-900/50">{photo.stampCode}</span>
                    ) : (
                        <span className="text-zinc-600 text-xs italic">-</span>
                    )}
                </td>
                <td className="py-4 px-6 text-sm text-zinc-300">
                    {photo.customerEmail ? (
                    <div className="flex items-center gap-2 text-zinc-200">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        {photo.customerEmail}
                    </div>
                    ) : (
                    <span className="text-zinc-600 italic">No email</span>
                    )}
                </td>
                <td className="py-4 px-6 text-sm text-zinc-300">
                    {formatCurrency(photo.price || 50000)}
                </td>
                <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    photo.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    photo.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {photo.status}
                    </span>
                </td>
                <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setEditingPhoto(photo)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors"
                        title="Edit Details"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-zinc-700 mx-1"></div>

                    {photo.status !== 'paid' && (
                        <button 
                        onClick={() => onUpdateStatus(photo.id, 'paid')}
                        className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                        title="Confirm Payment (Sends Email)"
                        >
                        <Check className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={() => onUpdateStatus(photo.id, 'unpaid')}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 p-2 rounded-lg transition-colors"
                        title="Reset Status"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-zinc-700 mx-1"></div>

                    <a 
                        href={photo.url} 
                        download={`photo-${photo.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-zinc-800 hover:bg-zinc-700 text-blue-400 p-2 rounded-lg transition-colors"
                        title="Download Photo"
                    >
                        <Download className="w-4 h-4" />
                    </a>

                    <button 
                        onClick={() => handleDownloadQRCard(photo)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors"
                        title="Download QR Card"
                    >
                        <QrCode className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={() => onDelete(photo.id, photo.fileName)}
                        className="bg-zinc-800 hover:bg-red-900/30 hover:text-red-500 text-zinc-400 p-2 rounded-lg transition-colors"
                        title="Delete Photo"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>

        {filteredPhotos.length === 0 && (
            <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800">
            <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">No photos found</p>
            </div>
        )}
    </div>

    {/* EDIT MODAL */}
    {editingPhoto && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row my-auto">
            
            {/* SCANNER OVERLAY */}
            {isScanning && (
                <div className="absolute inset-0 z-[150] bg-black flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
                        <div className="p-4 flex justify-between items-center border-b border-zinc-800">
                            <h3 className="font-bold text-white flex gap-2"><ScanLine className="w-5 h-5"/> Quét mã Stamp</h3>
                            <button onClick={() => setIsScanning(false)}><X className="w-6 h-6 text-white"/></button>
                        </div>
                        <div className="p-4">
                             <div id="gallery-scanner" className="w-full bg-black rounded-lg overflow-hidden border border-zinc-700"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left: Image Preview */}
            <div className="w-full md:w-1/3 bg-black flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-zinc-800 relative group">
                <img src={editingPhoto.url} className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg mb-4" alt="Preview" />
                
                <div className="flex w-full gap-2">
                    <a 
                        href={editingPhoto.url} 
                        download={`photo-${editingPhoto.id}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        title="Download Original File"
                    >
                        <Download className="w-3 h-3" /> Original
                    </a>
                    <button 
                        type="button"
                        onClick={() => handleDownloadQRCard(editingPhoto)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        title="Download QR Card"
                    >
                        <QrCode className="w-3 h-3" /> QR
                    </button>
                </div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5"/> Edit Photo Details</h3>
                        <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(editingPhoto.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setEditingPhoto(null)} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSaveEdit} className="space-y-4 flex-1">
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">Photo ID</label>
                        <input 
                            disabled type="text" 
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-400 font-mono cursor-not-allowed"
                            value={editingPhoto.id}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">Stamp Code</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-green-400 font-mono uppercase focus:border-green-500 focus:outline-none"
                                value={editingPhoto.stampCode || ''}
                                onChange={(e) => setEditingPhoto(prev => prev ? {...prev, stampCode: e.target.value} : null)}
                                placeholder="Scan or enter code..."
                            />
                            <button 
                                type="button" 
                                onClick={() => setIsScanning(true)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-lg flex items-center justify-center"
                                title="Scan QR"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">Customer Email</label>
                        <input 
                            type="email" placeholder="No email registered"
                            className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                            value={editingPhoto.customerEmail || ''}
                            onChange={(e) => setEditingPhoto(prev => prev ? {...prev, customerEmail: e.target.value} : null)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Price (VNĐ)</label>
                            <input 
                                type="number" 
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                value={editingPhoto.price}
                                onChange={(e) => setEditingPhoto(prev => prev ? {...prev, price: parseInt(e.target.value) || 0} : null)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Status</label>
                            <select 
                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-white focus:outline-none"
                                value={editingPhoto.status}
                                onChange={(e) => setEditingPhoto(prev => prev ? {...prev, status: e.target.value as Photo['status']} : null)}
                            >
                                <option value="unpaid">Unpaid</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 mt-auto flex gap-3">
                        <button type="button" onClick={() => setEditingPhoto(null)} className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 bg-white text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4"/> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    )}
    </>
  );
});

export default GalleryTab;
