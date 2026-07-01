'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FILTER_GROUPS, FilterGroup, FilterOption, QueueItem, TariffSelection, filterPillLabel, tariffShortLabel } from '@/lib/tariffs';

interface FilterBarProps {
  options: Record<FilterGroup, FilterOption[]>;
  selection: TariffSelection | null;
  onSelect: (selection: TariffSelection | null) => void;
  queue: QueueItem[];
}

export default function FilterBar({ options, selection, onSelect, queue }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<FilterGroup | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveGroup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isActive = (group: FilterGroup, key: string) =>
    selection?.group === group && selection?.key === key;

  const toggle = (group: FilterGroup, key: string) => {
    onSelect(isActive(group, key) ? null : { group, key });
    setOpen(false);
    setActiveGroup(null);
  };

  const visibleGroups = FILTER_GROUPS.filter(g => options[g].length > 0);

  const queueVisible = queue
    .map(p => {
      if (p.group === 'Deal') {
        return options['Deal'].length > 0 ? { ...p, label: filterPillLabel(p.group, 'Deals') } : null;
      }
      const exists = options[p.group]?.some(o => o.key === p.key);
      return exists ? { ...p, label: filterPillLabel(p.group, tariffShortLabel(p.group, p.key)) } : null;
    })
    .filter((p): p is QueueItem & { label: string } => p !== null);

  const renderPill = (p: QueueItem & { label: string }, overlapTab = false) => {
    const active = isActive(p.group, p.key);
    return (
      <button
        key={`${p.group}:${p.key}`}
        onClick={() => toggle(p.group, p.key)}
        className={`relative inline-flex items-center gap-1.5 h-7 text-xs px-3 rounded-full transition-colors ${
          overlapTab ? '-ml-3.5' : ''
        } ${
          active
            ? 'bg-white text-slate-700'
            : 'bg-[#0f172a] border border-white/10 text-slate-300 hover:text-slate-100 hover:bg-[#1e293b]'
        }`}
      >
        {p.label}
        {active && <X size={11} className="opacity-60" />}
      </button>
    );
  };

  const [firstPill, ...restPills] = queueVisible;

  return (
    <div ref={ref} className="flex items-center gap-2 flex-wrap">
      {/* "Filtered by" label — the first pill overlaps its right edge by one radius
          (-ml-3.5), so the pill's own rounded left cap draws the "(" seam and no
          straight dividing line is ever visible. */}
      <div className="flex items-center h-7">
        <span
          className={`flex items-center h-7 bg-white text-slate-700 text-xs font-medium pl-3 ${
            firstPill ? 'pr-5 rounded-l-full' : 'px-3 rounded-full'
          }`}
        >
          Display:
        </span>
        {firstPill && renderPill(firstPill, true)}
      </div>

      {restPills.map(p => renderPill(p))}

      {/* More button — popover anchors to this button */}
      <div className="relative">
        <button
          onClick={() => { setOpen(o => !o); setActiveGroup(null); }}
          className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors ${
            open
              ? 'bg-white/20 text-white'
              : 'bg-[#0f172a] border border-white/10 text-slate-300 hover:text-slate-100 hover:bg-[#1e293b]'
          }`}
        >
          More
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full mt-2 left-0 z-50 min-w-[15rem] bg-[#0f172a] border border-white/10 rounded-lg overflow-hidden shadow-xl">
            {activeGroup === null ? (
              <div className="py-1">
                {visibleGroups.map(g => {
                  const isSingle = options[g].length <= 1;
                  const groupActive = selection?.group === g;
                  return (
                    <button
                      key={g}
                      onClick={() => isSingle ? toggle(g, options[g][0].key) : setActiveGroup(g)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className={`text-sm font-medium whitespace-nowrap ${groupActive ? 'text-white' : 'text-slate-300'}`}>
                        {g}
                        {groupActive && (
                          <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-white align-middle" />
                        )}
                      </span>
                      {!isSingle && <ChevronRight size={14} className="text-slate-500 ml-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
                  <button
                    onClick={() => setActiveGroup(null)}
                    className="p-0.5 -ml-1 rounded text-slate-400 hover:text-white transition-colors"
                    aria-label="Back"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs text-slate-400 uppercase tracking-widest">{activeGroup}</span>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {options[activeGroup].map(opt => {
                    const active = isActive(activeGroup, opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggle(activeGroup, opt.key)}
                        className={`w-full text-left px-4 py-2 text-sm leading-snug transition-colors ${
                          active
                            ? 'text-white bg-white/10'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
