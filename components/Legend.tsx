'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Filter, X } from 'lucide-react';
import {
  FILTER_GROUPS, FilterGroup, TariffSelection, FilterOption,
  STATUS_SCALES, MAX_SCALE_RATE, rateColor,
} from '@/lib/tariffs';

interface LegendProps {
  options: Record<FilterGroup, FilterOption[]>;
  selection: TariffSelection | null;
  scaleStatus: string;
  onSelect: (selection: TariffSelection | null) => void;
}

function RateScale({ status }: { status: string }) {
  const [light, dark] = STATUS_SCALES[status] ?? STATUS_SCALES.implemented;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className="mt-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{label} rate</p>
      <span
        className="block h-2.5 rounded-sm"
        style={{ background: `linear-gradient(to right, #ffffff, ${light}, ${dark})` }}
      />
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>0% / TBD</span>
        <span>{MAX_SCALE_RATE}%+</span>
      </div>
    </div>
  );
}

function DealKey() {
  return (
    <div className="mt-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Deal type</p>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rateColor('implemented', '20%') }} />
          Agreement
        </span>
        <span className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rateColor('threatened', '20%') }} />
          Framework
        </span>
      </div>
    </div>
  );
}

export default function Legend({ options, selection, scaleStatus, onSelect }: LegendProps) {
  const [picking, setPicking] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterGroup | null>(null);

  const closePicker = () => { setPicking(false); setActiveCategory(null); };
  const choose = (sel: TariffSelection | null) => { onSelect(sel); closePicker(); };

  // Compact (default) view — shows the active selection chip + scale.
  if (!picking) {
    const opts = selection ? options[selection.group] : [];
    const activeLabel = selection
      ? (opts.find(o => o.key === selection.key)?.label ?? selection.key)
      : '';
    const isSingle = opts.length <= 1;
    const chipText = !selection ? '' : isSingle ? selection.group : `${selection.group} › ${activeLabel}`;

    return (
      <div className="flex-shrink-0 border-t border-white/10 bg-[#0a0f1e] p-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Coloring map by</p>

        {selection ? (
          <>
            <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-lg pl-3 pr-1.5 py-2">
              <span className="text-sm text-white flex-1 leading-snug">{chipText}</span>
              <button
                onClick={() => setPicking(true)}
                aria-label="Change tariff"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <Filter size={14} />
              </button>
              <button
                onClick={() => onSelect(null)}
                aria-label="Clear filter"
                className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
            {selection.group === 'Deal' ? <DealKey /> : <RateScale status={scaleStatus} />}
          </>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="w-full flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-left hover:bg-white/[0.08] transition-colors"
          >
            <span className="text-sm text-slate-400 flex-1">Choose a tariff</span>
            <Filter size={14} className="text-slate-400 flex-shrink-0" />
          </button>
        )}
      </div>
    );
  }

  // Picker view — drill into a category, then pick a tariff.
  const visibleGroups = FILTER_GROUPS.filter(g => options[g].length > 0);

  return (
    <div className="flex-shrink-0 border-t border-white/10 bg-[#0a0f1e]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => (activeCategory ? setActiveCategory(null) : closePicker())}
            aria-label="Back"
            className="p-0.5 -ml-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-xs text-slate-500 uppercase tracking-widest truncate">
            {activeCategory ?? 'Choose a tariff'}
          </p>
        </div>
        <button
          onClick={closePicker}
          aria-label="Close picker"
          className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {activeCategory === null
          ? visibleGroups.map((g) => {
              const isSingle = options[g].length <= 1;
              const hasActive = selection?.group === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    if (isSingle) {
                      const opt = options[g][0];
                      choose(hasActive ? null : { group: g, key: opt.key });
                    } else {
                      setActiveCategory(g);
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <span className={`text-sm font-medium ${hasActive ? 'text-white' : 'text-slate-300'}`}>
                    {g}
                    {hasActive && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-white inline-block align-middle" />}
                  </span>
                  {!isSingle && <ChevronRight size={14} className="text-slate-400" />}
                </button>
              );
            })
          : options[activeCategory].map((opt) => {
              const isActive = selection?.group === activeCategory && selection.key === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => choose(isActive ? null : { group: activeCategory, key: opt.key })}
                  className={`w-full text-left px-4 py-2 text-xs leading-snug transition-colors ${
                    isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
      </div>
    </div>
  );
}
