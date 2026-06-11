'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  TARIFF_GROUPS, TariffGroup, TariffSelection, FilterOption,
  COLOR_SCHEMES,
} from '@/lib/tariffs';

interface LegendProps {
  options: Record<TariffGroup, FilterOption[]>;
  selection: TariffSelection | null;
  onSelect: (selection: TariffSelection | null) => void;
}

function RateScale({ group }: { group: TariffGroup }) {
  const scheme = COLOR_SCHEMES[group];
  return (
    <div className="px-3 pt-3 mt-1 border-t border-white/10">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Rate scale</p>
      <div className="flex items-center gap-1">
        <span className="w-3.5 h-3.5 rounded-sm border border-white/20" style={{ backgroundColor: '#ffffff' }} title="0%" />
        {scheme.map((c, i) => (
          <span
            key={c}
            className="w-3.5 h-3.5 rounded-sm"
            style={{ backgroundColor: c }}
            title={`${i * 5 + 1}–${(i + 1) * 5}%${i === scheme.length - 1 ? '+' : ''}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>0% / TBD</span>
        <span>{scheme.length * 5}%+</span>
      </div>
    </div>
  );
}

export default function Legend({ options, selection, onSelect }: LegendProps) {
  const [expanded, setExpanded] = useState<Record<TariffGroup, boolean>>({
    'Section 122': false, 'Section 232': false, 'Section 301': false, 'Others': false,
  });

  const toggle = (g: TariffGroup) =>
    setExpanded(prev => ({ ...prev, [g]: !prev[g] }));

  return (
    <div className="absolute bottom-8 left-4 z-10 w-72 bg-[#0f172a]/95 backdrop-blur-sm border border-white/10 rounded-xl py-3 flex flex-col max-h-[70vh]">
      <p className="text-xs text-slate-500 uppercase tracking-widest px-4 mb-2">Visualise a tariff</p>

      <div className="overflow-y-auto">
        {/* No filter */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
            selection === null ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5'
          }`}
        >
          No filter
        </button>

        {/* Categories */}
        {TARIFF_GROUPS.map((g) => {
          const opts = options[g];
          const isEmpty = opts.length === 0;
          const isSingle = opts.length === 1;
          const isOpen = expanded[g];
          const hasActive = selection?.group === g;

          // Single-option categories select directly instead of expanding.
          const onHeaderClick = () => {
            if (isEmpty) return;
            if (isSingle) {
              onSelect(hasActive ? null : { group: g, key: opts[0].key });
            } else {
              toggle(g);
            }
          };

          return (
            <div key={g}>
              <button
                onClick={onHeaderClick}
                disabled={isEmpty}
                className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors ${
                  isEmpty ? 'cursor-default' : 'hover:bg-white/5'
                } ${isSingle && hasActive ? 'bg-white/10' : ''}`}
              >
                <span className={`text-sm font-medium ${
                  isEmpty ? 'text-slate-600' : hasActive ? 'text-white' : 'text-slate-300'
                }`}>
                  {g}
                  {hasActive && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-white inline-block align-middle" />}
                </span>
                {!isSingle && (
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isEmpty ? 'text-slate-700' : 'text-slate-400'
                    } ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {isOpen && !isEmpty && !isSingle && (
                <div className="pb-1">
                  {opts.map((opt) => {
                    const isActive = selection?.group === g && selection.key === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => onSelect(isActive ? null : { group: g, key: opt.key })}
                        className={`w-full text-left pl-8 pr-4 py-1.5 text-xs leading-snug transition-colors ${
                          isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selection && <RateScale group={selection.group} />}
    </div>
  );
}
