
import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, MapPin, Loader2, Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSettings, getPhotoByStampCode } from '../services/mockBackend';
import { SiteSettings } from '../types';
// @ts-ignore
import { Html5Qrcode } from "html5-qrcode";

const Home: React.FC = () => {
  const [searchId, setSearchId] = useState('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // --- CAMERA LOGIC ---
  useEffect(() => {
    let isMounted = true;
    const elementId = "home-scanner";

    const cleanupScanner = async () => {
        if (scannerRef.current) {
            try {
                if(scannerRef.current.isScanning) {
                   await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch (error) {
                console.warn("Scanner cleanup warning:", error);
            }
            scannerRef.current = null;
        }
    };

    if (isScanning) {
        const timer = setTimeout(async () => {
            if (!isMounted) return;
            await cleanupScanner();

            const element = document.getElementById(elementId);
            if (!element) return;

            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;
            
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            try {
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    async (decodedText: string) => {
                         if (!isMounted) return;
                         
                         // FOUND CODE
                         html5QrCode.pause(true); // Pause to prevent double scan
                         
                         // Logic: Stamp Code or Photo ID
                         if (decodedText.toUpperCase().startsWith('ST')) {
                             const photo = await getPhotoByStampCode(decodedText.toUpperCase());
                             if (photo) {
                                 // Stop and Navigate
                                 await html5QrCode.stop();
                                 html5QrCode.clear();
                                 navigate(`/view/${photo.id}`);
                             } else {
                                 alert(`Không tìm thấy ảnh với mã Stamp: ${decodedText}`);
                                 html5QrCode.resume();
                             }
                         } else {
                             // Assume it's a Photo ID link or raw ID
                             // If it's a link (e.g. http://.../#/view/ID), extract ID
                             const match = decodedText.match(/view\/([A-Za-z0-9]+)/);
                             const id = match ? match[1] : decodedText;
                             
                             await html5QrCode.stop();
                             html5QrCode.clear();
                             navigate(`/view/${id}`);
                         }
                    },
                    (errorMessage: string) => {}
                );
            } catch (err) {
                console.error("Scanner Error", err);
                if (isMounted) setIsScanning(false);
            }
        }, 100);
        return () => clearTimeout(timer);
    } else {
        cleanupScanner();
    }
    
    return () => { isMounted = false; cleanupScanner(); }
  }, [isScanning, navigate]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    
    setLoading(true);
    let targetId = searchId.trim();

    // Check if it looks like a Stamp Code (ST...)
    if (targetId.toUpperCase().startsWith('ST')) {
        try {
            const photo = await getPhotoByStampCode(targetId.toUpperCase());
            if (photo) {
                targetId = photo.id;
            } else {
                alert("Mã Stamp không tồn tại hoặc chưa được gán.");
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi khi tìm kiếm.");
            setLoading(false);
            return;
        }
    }

    setLoading(false);
    navigate(`/view/${targetId}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 relative w-full">
      {/* Background Decor */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* SCANNER MODAL */}
      {isScanning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden relative">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                       <h3 className="font-bold text-white flex items-center gap-2"><Camera className="w-5 h-5"/> Quét QR Code</h3>
                       <button onClick={() => setIsScanning(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="p-4">
                      <div id="home-scanner" className="w-full bg-black rounded-lg overflow-hidden border border-zinc-800 aspect-square"></div>
                      <p className="text-center text-zinc-500 text-sm mt-4">Di chuyển camera đến mã QR (Stamp hoặc Photo ID)</p>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-3xl w-full space-y-12 text-center relative z-10 flex flex-col items-center mt-8 md:mt-16 mb-16">
        
        {/* Large Logo Image or Text */}
        <div className="flex flex-col items-center justify-center animate-fade-in mb-8 w-full min-h-[120px]">
           {settings ? (
             <>
                {settings.logoType === 'text' ? (
                  <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white uppercase drop-shadow-2xl">
                    {settings.logoText || "PHOTO MOMENTS"}
                  </h1>
                ) : (
                  <img
                    src={settings.logoImageUrl || './watermark/logo.png'}
                    alt="Logo"
                    className="w-full max-w-2xl h-auto max-h-[300px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
             </>
           ) : (
             <div className="flex justify-center h-[100px] items-center">
                 <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
             </div>
           )}
        </div>

         {/* About Section */}
        <div className="w-full pt-16 mt-8 border-t border-zinc-800">
           {settings ? (
             <>
                <h2 className="text-2xl font-bold text-white mb-2">{settings.aboutTitle}</h2>
                <p className="text-zinc-500 text-sm uppercase tracking-widest mb-8">Your Trusted Photography & Print Studio Since 2016</p>
                
                <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 text-left text-zinc-400 leading-relaxed space-y-4 shadow-xl backdrop-blur-sm whitespace-pre-wrap">
                    {settings.aboutContent}
                    
                    <div className="flex items-center gap-2 pt-6 mt-4 border-t border-zinc-800 text-white font-medium">
                      <MapPin className="w-5 h-5 text-red-500" />
                      <span>Visit us today and experience the difference.</span>
                    </div>
                </div>
             </>
           ) : (
             <div className="py-12 flex justify-center">
               <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
             </div>
           )}
        </div>

        {/* Feature Services / Polaroids */}
        {settings && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12">
            {[
              { title: settings.feature1Title, img: settings.feature1ImageUrl },
              { title: settings.feature2Title, img: settings.feature2ImageUrl },
              { title: settings.feature3Title, img: settings.feature3ImageUrl }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center space-y-3 group">
                <div className="bg-white p-2 md:p-3 shadow-2xl transform transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-1 w-full max-w-[280px]">
                  <div className="aspect-[3/4] overflow-hidden bg-zinc-200 relative">
                     <img 
                       src={item.img} 
                       alt={item.title} 
                       className="w-full h-full object-cover"
                     />
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg tracking-wide">{item.title}</h3>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar - WITH CAMERA */}
        <form onSubmit={handleSearch} className="relative w-full mx-auto group">
          <div className="absolute inset-0 bg-white/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center bg-zinc-900 border border-zinc-700 rounded-full p-2 pl-6 shadow-2xl transition-colors focus-within:border-white">
            <Search className="w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Nhập ID Ảnh hoặc Stamp Code (ST...)"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-zinc-600 h-12 px-4 text-lg"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            
            <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="bg-zinc-800 text-zinc-400 p-3 rounded-full hover:bg-zinc-700 hover:text-white transition-colors"
                  title="Quét QR Code"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 text-xs text-zinc-500 font-mono uppercase tracking-widest w-full justify-items-center mt-8 border-t border-zinc-800 pt-8">
          <div>Professional</div>
          <div>Instant</div>
          <div>Secure</div>
          <div>High-Res</div>
        </div>
      </div>
    </div>
  );
};

export default Home;
