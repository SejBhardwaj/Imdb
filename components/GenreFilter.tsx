'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { GENRES } from '@/lib/mockData';

interface GenreFilterProps {
  active: string;
  onChange: (genre: string) => void;
}

export default function GenreFilter({ active, onChange }: GenreFilterProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2">
      {GENRES.map((genre) => (
        <button
          key={genre}
          onClick={() => onChange(genre)}
          className={`genre-chip px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
            active === genre
              ? 'bg-[#E50914] text-white border-[#E50914] glow-red-sm'
              : 'glass text-[#CFCFCF] border-white/8 hover:border-white/20'
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
