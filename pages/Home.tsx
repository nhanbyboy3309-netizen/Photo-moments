import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../services/mockBackend';
import { SiteSettings } from '../types';

const Home: React.FC = () => {
  const [searchId, setSearchId] = useState('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/view/${searchId.trim()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 relative w-full">
      {/* Background Decor - Fixed position to stay consistent during scroll */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none -z-10" />

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
                      // Fallback to text if image fails and wasn't manually set to text mode
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

        {/* Search Bar - Changed max-w-md to w-full to match About Section */}
        <form onSubmit={handleSearch} className="relative w-full mx-auto group">
          <div className="absolute inset-0 bg-white/10 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center bg-zinc-900 border border-zinc-700 rounded-full p-2 pl-6 shadow-2xl transition-colors focus-within:border-white">
            <Search className="w-5 h-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Enter Photo ID (e.g. 01022025001)"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-zinc-600 h-12 px-4 text-lg"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-white text-black p-3 rounded-full hover:bg-zinc-200 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 text-xs text-zinc-500 font-mono uppercase tracking-widest w-full justify-items-center">
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