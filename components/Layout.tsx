import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.includes('admin');
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <header className="border-b border-zinc-900 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            
          </Link>
          
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link to="/admin" className={`transition-colors ${isAdmin ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative">
        {children}
      </main>

      <footer className="border-t border-zinc-900 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Photo Moments. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};