'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Menu, Bookmark, Bell, User, Film, Tv, Users, Star, TrendingUp, ChevronDown, Flame } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '#' },
  { label: 'Movies', href: '#movies' },
  { label: 'TV Shows', href: '#tvshows' },
  { label: 'People', href: '#' },
  { label: 'Top Rated', href: '#toprated' },
  { label: 'Trending', href: '#trending' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('Home');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  const QUICK_SEARCHES = ['Dune Part Two', 'Oppenheimer', 'The Last of Us', 'Attack on Titan'];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 backdrop-blur-xl bg-[#080808]/95 border-b border-white/10"
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#E50914] flex items-center justify-center glow-red-sm group-hover:scale-105 transition-transform">
                <Film size={18} strokeWidth={2.5} className="text-white" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white tracking-tight">Cine</span>
              <span className="text-xl font-black text-[#E50914] tracking-tight">Verse</span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setActiveLink(link.label)}
                className={`nav-link text-sm font-medium transition-colors ${
                  activeLink === link.label
                    ? 'text-[#E50914] active'
                    : 'text-[#CFCFCF] hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-[#8B8B8B] hover:text-white hover:border-white/15 transition-all duration-200 text-sm"
            >
              <Search size={15} />
              <span className="hidden md:block text-xs">Search</span>
              <kbd className="hidden md:block text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/30 font-mono">⌘K</kbd>
            </button>

            {/* Watchlist */}
            <button className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-[#CFCFCF] hover:text-white transition-all text-sm hover:border-white/15">
              <Bookmark size={15} />
              <span className="text-xs">Watchlist</span>
            </button>

            {/* Notification */}
            <button className="relative p-2 rounded-xl glass text-[#8B8B8B] hover:text-white transition-all hover:border-white/15">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#E50914] rounded-full border border-[#080808]" />
            </button>

            {/* User */}
            <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E50914] to-[#ff6b35] flex items-center justify-center hover:scale-105 transition-transform">
              <User size={16} className="text-white" />
            </button>

            {/* Mobile Menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl glass text-[#CFCFCF] hover:text-white transition-all"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden mt-2 mx-4 rounded-2xl glass-dark border border-white/8 overflow-hidden animate-scale-in relative z-[9998]">
            <div className="p-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => { setActiveLink(link.label); setMobileOpen(false); }}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-[#CFCFCF] hover:text-white hover:bg-white/5 transition-all"
                >
                  {link.label}
                </a>
              ))}
              <div className="my-2 border-t border-white/8" />
              <a href="#" className="px-4 py-3 rounded-xl text-sm font-medium text-[#CFCFCF] hover:text-white hover:bg-white/5 transition-all flex items-center gap-3">
                <Bookmark size={15} /> Watchlist
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-20 px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative w-full max-w-2xl animate-scale-in">
            <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
                <Search size={18} className="text-[#E50914] flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search movies, TV shows, actors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-[#8B8B8B] text-base outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[#8B8B8B] hover:text-white">
                    <X size={16} />
                  </button>
                )}
                <kbd className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/30 font-mono flex-shrink-0">ESC</kbd>
              </div>

              {/* Quick Searches */}
              <div className="p-5">
                <p className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <TrendingUp size={12} /> Trending Searches
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {QUICK_SEARCHES.map((q) => (
                    <button
                      key={q}
                      onClick={() => setSearchQuery(q)}
                      className="px-3 py-1.5 rounded-full glass border border-white/10 text-xs text-[#CFCFCF] hover:text-white hover:border-white/20 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {!searchQuery && (
                  <>
                    <p className="text-xs font-semibold text-[#8B8B8B] uppercase tracking-widest mb-3">Quick Access</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: <Film size={14} />, label: 'Movies' },
                        { icon: <Tv size={14} />, label: 'TV Shows' },
                        { icon: <Users size={14} />, label: 'Actors' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl glass border border-white/8 text-sm text-[#CFCFCF] hover:text-white hover:border-white/15 transition-all"
                        >
                          <span className="text-[#E50914]">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {searchQuery && (
                  <div className="space-y-1">
                    {['Movies', 'TV Shows', 'Actors'].map((type) => (
                      <button
                        key={type}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-left"
                      >
                        <Search size={14} className="text-[#E50914]" />
                        <span className="text-sm text-[#CFCFCF]">
                          <span className="text-white font-medium">"{searchQuery}"</span> in {type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
