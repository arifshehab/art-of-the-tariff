'use client';

import { TariffRateTier } from '@/types/tariff';

interface LegendProps {
  activeFilter: TariffRateTier | 'all';
  onFilterChange: (filter: TariffRateTier | 'all') => void;
  counts: Record<string, number>;
}

const ITEMS: { key: TariffRateTier | 'all'; label: string; color: string }[] = [
  { key: 'all',    label: 'All rates', color: '#475569' },
  { key: '10%',    label: '10%',       color: '#f59e0b' },
  { key: '12.5%',  label: '12.5%',     color: '#ef4444' },
];

export default function Legend({ activeFilter, onFilterChange, counts }: LegendProps) {
  return (
    <div className="absolute bottom-8 left-4 z-10 bg-[#0f172a]/95 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col gap-2">
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Filter by rate</p>
      {ITEMS.map(({ key, label, color }) => {
        const count = key === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : counts[key] ?? 0;
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              isActive ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm text-slate-300 flex-1">{label}</span>
            <span className="text-xs text-slate-500 tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
