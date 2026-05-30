
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Printer, Home, Search, Package, Lock, User, Menu as MenuIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { getSettings } from '../services/mockBackend';
import { SiteSettings, NavItem } from '../types';

// Helper to render Lucide icons by name
const IconRenderer = ({ name, className }: { name?: string; className?: string }) => {
  if (!name) return null;
  // @ts-ignore
  const IconComponent = Icons[name];
  return IconComponent ? <IconComponent className={className} /> : null;
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.includes('admin');
  
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSettings().then(s => {
        setSettings(s);
        if (s.logoImageUrl) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) link.href = s.logoImageUrl;
        }
        if (s.logoText) document.title = s.logoText;
    });
  }, [location.pathname]); // Re-fetch on path change to catch settings updates
  
  const logoUrl = settings?.logoImageUrl || './watermark/logo.png';
  const logoText = settings?.logoText || 'PHOTO MOMENTS';
  const navItems = settings?.navigationItems || [];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <header className="border-b border-zinc-900 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoUrl} alt={logoText} className="h-10 w-auto object-contain" />
            <span className="font-bold text-lg tracking-wider hidden sm:block uppercase">{logoText}</span>
          </Link>
          
          <nav className="flex items-center gap-6 text-sm font-medium overflow-x-auto no-scrollbar py-2">
            {navItems.filter(item => item.isVisible).map(item => {
              const isActive = location.pathname === item.path;
              
              if (item.isExternal) {
                return (
                  <a 
                    key={item.id} 
                    href={item.path} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <IconRenderer name={item.iconName} className="w-4 h-4" />
                    {item.label}
                  </a>
                );
              }

              return (
                <Link 
                  key={item.id} 
                  to={item.path} 
                  className={`transition-colors flex items-center gap-1 whitespace-nowrap ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  <IconRenderer name={item.iconName} className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {children}
      </main>

      <footer className="border-t border-zinc-900 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-600 text-sm">
          <p>&copy; {new Date().getFullYear()} {logoText}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
