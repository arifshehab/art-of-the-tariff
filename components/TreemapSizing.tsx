'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import importsData from '@/data/imports_by_country_gtap.json';

// Sector options are derived from the import dataset's numeric keys. "total_imports"
// becomes "All sectors"; every other key is labelled by its parenthetical name
// (e.g. "omf (Manufactures Nec)" → "Manufactures Nec"). s232_pharma is omitted.
export const SIZING_TOTAL = 'total_imports';

const META_KEYS = new Set(['country_name', 'code', 'region']);
const OMITTED_KEYS = new Set(['s232_pharma_imports (131 HS codes)']);

export interface SizingOption {
  key: string;     // the dataset key used to size the treemap
  label: string;   // label shown in the dropdown menu and the tab
}

/** "omf (Manufactures Nec)" → "Manufactures Nec (omf)"; "total_imports" → "All sectors". */
function labelFor(key: string): string {
  if (key === SIZING_TOTAL) return 'All sectors';
  const m = key.match(/^(\S+)\s*\(([^)]*)\)$/);
  return m ? `${m[2]} (${m[1]})` : key;
}

export const SIZING_OPTIONS: SizingOption[] = Object.keys(importsData.countries[0])
  .filter(k => !META_KEYS.has(k) && !OMITTED_KEYS.has(k))
  .map(k => ({ key: k, label: labelFor(k) }))
  // "All sectors" pinned first; the rest alphabetical by label.
  .sort((a, b) => {
    if (a.key === SIZING_TOTAL) return -1;
    if (b.key === SIZING_TOTAL) return 1;
    return a.label.localeCompare(b.label);
  });

/** Label for the current sizing key, used in the tab caption. */
export function sizingShortLabel(key: string): string {
  return (SIZING_OPTIONS.find(o => o.key === key) ?? SIZING_OPTIONS[0]).label;
}

interface TreemapSizingProps {
  value: string;
  onChange: (key: string) => void;
}

export default function TreemapSizing({ value, onChange }: TreemapSizingProps) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // drives the entrance transition
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Animate in on mount (the component only mounts when the treemap view opens),
  // drawing the eye to the control right when it appears.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Reset the search each time the menu opens, and scroll so the current
  // selection sits at the top.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const menu = menuRef.current, sel = selectedRef.current;
    if (menu && sel) menu.scrollTop = sel.offsetTop;
  }, [open]);

  const current = SIZING_OPTIONS.find(o => o.key === value) ?? SIZING_OPTIONS[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIZING_OPTIONS;
    return SIZING_OPTIONS.filter(o => o.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <div
      ref={ref}
      className={`relative flex items-center origin-left transition-all duration-300 ease-out ${
        shown ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
      }`}
    >
      {/* Flush panel that reads as the tab expanding to reveal the sector picker. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Choose sector"
        className="flex items-center gap-1.5 bg-white/10 border border-white/10 border-l-0 rounded-r-lg px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/15 transition-colors whitespace-nowrap"
      >
        <SlidersHorizontal size={13} className="text-slate-300" />
        Sector: {current.label}
        <ChevronDown size={13} className={`text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-64 rounded-lg border border-white/10 bg-[#0f172a] shadow-xl shadow-black/40 overflow-hidden">
          <div className="relative border-b border-white/10">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sectors…"
              className="w-full bg-transparent pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <div ref={menuRef} className="relative max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500">No sectors match “{query.trim()}”.</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.key}
                  ref={o.key === value ? selectedRef : undefined}
                  onClick={() => { onChange(o.key); setOpen(false); }}
                  className={`w-full flex items-center px-3 py-2 text-left text-xs transition-colors ${
                    o.key === value ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
