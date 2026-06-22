'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Tariff } from '@/types/tariff';
import { Search, X } from 'lucide-react';

interface CountrySearchProps {
  tariffs: Tariff[];
  onSelect: (tariff: Tariff) => void;
}

export default function CountrySearch({ tariffs, onSelect }: CountrySearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // All countries, alphabetical by name.
  const sorted = useMemo(
    () => [...tariffs].sort((a, b) => a.country.localeCompare(b.country)),
    [tariffs],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(t => t.country.toLowerCase().includes(q));
  }, [sorted, query]);

  // Keep the highlighted row in range as the result set shrinks/grows.
  useEffect(() => setActiveIndex(0), [query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const choose = (tariff: Tariff) => {
    onSelect(tariff);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && matches[activeIndex]) choose(matches[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative px-4 py-3 border-b border-white/10 flex-shrink-0">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for a country…"
          className="w-full bg-[#0a0f1e] border border-white/10 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(true); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-500 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-4 right-4 top-full -mt-1 z-20 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-[#0f172a] shadow-xl shadow-black/40">
          {matches.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-500">No countries match “{query.trim()}”.</p>
          ) : (
            matches.map((t, i) => (
              <button
                key={t.country_code}
                onClick={() => choose(t)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.com/${t.country_code.toLowerCase()}.svg`}
                  alt=""
                  className="w-5 h-auto rounded-sm flex-shrink-0 ring-1 ring-white/10"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
                <span className="truncate">{t.country}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
