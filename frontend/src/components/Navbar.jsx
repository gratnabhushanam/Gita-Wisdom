import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Book, Menu, X, BrainCircuit, User, Star, Zap, Heart, Search, Film, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 1);
  };

  const navLinks = [
    { name: 'Home', path: '/home', icon: <BookOpen className="w-4 h-4 mr-1.5" /> },
    { name: 'Gita Mentor', path: '/mentor', icon: <Heart className="w-4 h-4 mr-1.5" /> },
    { name: 'Reels', path: '/reels', icon: <Zap className="w-4 h-4 mr-1.5" /> },
    { name: 'Kids', path: '/kids', icon: <Star className="w-4 h-4 mr-1.5" /> },
    { name: 'Movies', path: '/movies', icon: <Film className="w-4 h-4 mr-1.5" /> },
    { name: 'Search', path: '/search', icon: <Search className="w-4 h-4 mr-1.5" /> },
    { name: 'Chapters', path: '/chapters', icon: <Book className="w-4 h-4 mr-1.5" /> },
      { name: 'Daily Sloka', path: '/daily-sloka', icon: <BrainCircuit className="w-4 h-4 mr-1.5" /> },
    ...(user?.role === 'admin' ? [{ name: 'Admin', path: '/admin', icon: <Shield className="w-4 h-4 mr-1.5" /> }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
  <nav className="fixed w-full z-50 bg-gradient-to-r from-[#04101D] via-[#061428] to-[#04101D]/95 backdrop-blur-xl border-b border-devotion-gold/15 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex-shrink-0 flex items-center gap-3">
            <Link to="/home" className="group flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 bg-gradient-to-br from-devotion-gold/20 to-devotion-gold/10 rounded-lg flex items-center justify-center border border-devotion-gold/30 group-hover:shadow-[0_0_18px_rgba(255,215,0,0.18)] transition-all">
                <div className="text-sm text-devotion-gold font-serif font-bold">ॐ</div>
              </div>
              <span className="text-base font-bold bg-gradient-to-r from-devotion-gold to-[#FFE6A5] bg-clip-text text-transparent tracking-tight">
                GitaWisdom
              </span>
            </Link>
          </div>
          
          <div className="hidden lg:block">
            <div className="ml-8 flex items-center space-x-0.5">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.path} 
                  className={`flex items-center px-2.5 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-[0.16em] transition-all duration-300 ${isActive(link.path) ? 'bg-devotion-gold/15 text-devotion-gold border border-devotion-gold/30 shadow-[0_0_18px_rgba(255,215,0,0.12)]' : 'text-gray-400 hover:text-devotion-gold hover:bg-devotion-gold/10'}`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
              
              <div className="h-5 w-px bg-devotion-gold/20 mx-2"></div>
              
              {user ? (
                <Link to="/profile" className="group flex items-center px-2.5 py-1.5 bg-devotion-gold/10 border border-devotion-gold/20 rounded-lg transition-all hover:border-devotion-gold/40 hover:bg-devotion-gold/20">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="" className="w-4 h-4 rounded-full object-cover mr-1.5 border border-devotion-gold/50" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-devotion-gold/30 to-devotion-gold/10 flex items-center justify-center mr-1.5 border border-devotion-gold/50">
                       <span className="text-[9px] font-bold text-devotion-gold">{getInitials(user.name)}</span>
                    </div>
                  )}
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gray-200">Profile</span>
                </Link>
              ) : (
                <Link to="/login" className="group flex items-center px-2.5 py-1.5 bg-gradient-to-r from-devotion-gold/20 to-[#FFE6A5]/10 border border-devotion-gold/30 rounded-lg transition-all hover:border-devotion-gold/50 hover:from-devotion-gold/30 hover:to-[#FFE6A5]/20">
                  <User className="w-3 h-3 mr-1 text-devotion-gold group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gray-200">Login</span>
                </Link>
              )}
            </div>
          </div>

          <div className="lg:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-devotion-gold hover:text-white transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-gradient-to-b from-[#081426] to-[#04101D] border-b border-devotion-gold/20 absolute w-full shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
          <div className="px-4 pt-3 pb-5 space-y-2 sm:px-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2 rounded-lg font-semibold text-[11px] uppercase tracking-[0.15em] transition-all ${isActive(link.path) ? 'bg-devotion-gold/15 text-devotion-gold border border-devotion-gold/30' : 'text-gray-400 hover:text-devotion-gold hover:bg-devotion-gold/10'}`}
              >
                {link.icon}
                {link.name}
              </Link>
            ))}
            {user ? (
              <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center px-3 py-2 text-gray-400 hover:text-devotion-gold transition-colors mt-3 border-t border-devotion-gold/10 pt-3 text-xs">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="w-6 h-6 rounded-full object-cover mr-3 border-2 border-devotion-gold/50" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-devotion-gold/30 to-devotion-gold/10 flex items-center justify-center mr-3 border-2 border-devotion-gold/50">
                     <span className="text-[10px] font-bold text-devotion-gold">{getInitials(user.name)}</span>
                  </div>
                )}
                Profile
              </Link>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="flex items-center px-3 py-2 text-gray-400 hover:text-devotion-gold transition-colors mt-3 border-t border-devotion-gold/10 pt-3 text-xs">
                <User className="w-4 h-4 mr-2" />
                Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
