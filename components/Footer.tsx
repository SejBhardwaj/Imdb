'use client';

import { Mail, Film, Github, Twitter, Instagram, Youtube, Heart } from 'lucide-react';

export default function Footer() {
  const LINK_GROUPS = [
    {
      title: 'Discover',
      links: ['Trending Movies', 'Popular TV Shows', 'New Releases', 'Top Rated', 'Upcoming'],
    },
    {
      title: 'Genres',
      links: ['Action', 'Drama', 'Sci-Fi', 'Comedy', 'Horror'],
    },
    {
      title: 'Account',
      links: ['My Watchlist', 'Favourites', 'Reviews', 'Settings', 'Profile'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Press', 'Contact', 'Privacy'],
    },
  ];

  return (
    <footer className="relative pt-20 pb-10 border-t border-white/5 bg-[#0a0a0a]">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Newsletter CTA */}
        <div className="relative mb-16 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E50914]/20 via-[#181818] to-[#181818]" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl" />
          <div className="relative p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
                Stay in the Scene
              </h3>
              <p className="text-[#CFCFCF] text-sm md:text-base">
                Get weekly recommendations, new trailers and trending releases straight to your inbox.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-xl glass border-white/10 text-white placeholder-[#8B8B8B] text-sm focus:outline-none focus:border-[#E50914]"
              />
              <button className="btn-primary justify-center">
                <Mail size={16} />
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#E50914] flex items-center justify-center">
                <Film size={18} strokeWidth={2.5} className="text-white" />
              </div>
              <div>
                <span className="text-xl font-black text-white">Cine</span>
                <span className="text-xl font-black text-[#E50914]">Verse</span>
              </div>
            </a>
            <p className="text-sm text-[#8B8B8B] mb-5 max-w-xs">
              Your premium destination for discovering movies, TV shows and the people behind them.
            </p>
            <div className="flex items-center gap-2">
              {[Twitter, Instagram, Youtube, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl glass border-white/8 flex items-center justify-center text-[#8B8B8B] hover:text-white hover:border-[#E50914]/30 hover:bg-[#E50914]/10 transition-all"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[#8B8B8B] hover:text-[#E50914] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#8B8B8B]">
            © 2024 CineVerse. Crafted with <Heart size={11} className="inline text-[#E50914] fill-[#E50914]" /> for cinephiles.
          </p>
          <div className="flex items-center gap-5 text-xs text-[#8B8B8B]">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
