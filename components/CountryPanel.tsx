'use client';

import { useState, useEffect } from 'react';
import { Tariff, TariffStatus, TariffType } from '@/types/tariff';
import { getMergedTariffTypes, groupOf, TARIFF_GROUPS, TariffGroup } from '@/lib/tariffs';
import { ChevronDown, ExternalLink, X } from 'lucide-react';

interface CountryPanelProps {
  tariff: Tariff | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<TariffStatus, { label: string; className: string }> = {
  implemented: { label: 'Implemented', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  confirmed:   { label: 'Confirmed',   className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  paused:      { label: 'Paused',      className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  threatened:  { label: 'Threatened',  className: 'bg-violet-500/20 text-violet-400 border border-violet-500/30' },
  none:        { label: 'None',        className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
};

const GROUPS = TARIFF_GROUPS;
type GroupName = TariffGroup;

function detailHeading(tt: TariffType, group: GroupName): string {
  if (group === 'Others') {
    // "Additional (dairy and lumber)" + product_category "Dairy and lumber" → just "Additional";
    // keep the full name when the parenthetical isn't the product (e.g. "Additional (DSTs)").
    const m = tt.name.match(/^Additional \((.+)\)$/);
    if (m && m[1].toLowerCase() === tt.product_category.toLowerCase()) return 'Additional';
    return tt.name;
  }
  return tt.sub_category ?? tt.product_category;
}

function TariffDetail({ tt, group }: { tt: TariffType; group: GroupName }) {
  const showAppliesTo = group === 'Others' || !!tt.sub_category;
  return (
    <div className="space-y-3 py-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            {detailHeading(tt, group)}
          </p>
          <p className="text-2xl font-bold text-white">{tt.rate}</p>
        </div>
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_CONFIG[tt.status].className}`}>
          {STATUS_CONFIG[tt.status].label}
        </span>
      </div>
      {showAppliesTo && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Applies To</p>
          <p className="text-sm text-slate-300">{tt.product_category}</p>
        </div>
      )}
      {tt.effective_date && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            {tt.status === 'threatened' ? 'Proposed Date' : 'Effective Date'}
          </p>
          <p className="text-sm text-slate-300">{tt.effective_date === 'TBD' ? 'To be determined' : tt.effective_date}</p>
        </div>
      )}
      {tt.citation_url && (
        <a
          href={tt.citation_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors"
        >
          <ExternalLink size={12} />
          View source
        </a>
      )}
    </div>
  );
}

export default function CountryPanel({ tariff, onClose }: CountryPanelProps) {
  const isVisible = tariff !== null;
  const [expanded, setExpanded] = useState<Record<GroupName, boolean>>({
    'Section 122': false, 'Section 232': false, 'Section 301': false, 'Others': false,
  });

  // Collapse all groups whenever a different country is selected.
  useEffect(() => {
    setExpanded({ 'Section 122': false, 'Section 232': false, 'Section 301': false, 'Others': false });
  }, [tariff?.country_code]);

  const visibleTypes = tariff ? getMergedTariffTypes(tariff) : [];
  const grouped: Record<GroupName, TariffType[]> = {
    'Section 122': [], 'Section 232': [], 'Section 301': [], 'Others': [],
  };
  for (const tt of visibleTypes) grouped[groupOf(tt)].push(tt);

  const toggle = (g: GroupName) =>
    setExpanded(prev => ({ ...prev, [g]: !prev[g] }));

  const nonEmptyGroups = GROUPS.filter(g => grouped[g].length > 0);
  const allExpanded = nonEmptyGroups.length > 0 && nonEmptyGroups.every(g => expanded[g]);

  const setAll = (open: boolean) =>
    setExpanded({
      'Section 122': open, 'Section 232': open, 'Section 301': open, 'Others': open,
    });

  return (
    <div
      className={`
        absolute top-4 right-4 w-80 z-10
        bg-[#0f172a]/95 backdrop-blur-sm
        border border-white/10 rounded-xl
        shadow-2xl overflow-hidden
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
      `}
    >
      {tariff && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-white/10">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Selected Country</p>
              <h2 className="text-xl font-semibold text-white">{tariff.country}</h2>
            </div>
            <button
              onClick={onClose}
              className="mt-1 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">

            {/* Expand / collapse all */}
            {nonEmptyGroups.length > 0 && (
              <div className="flex justify-end px-5 pt-3">
                <button
                  onClick={() => setAll(!allExpanded)}
                  className="text-xs text-slate-500 hover:text-white transition-colors"
                >
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              </div>
            )}

            {/* Tariff groups */}
            <div className="divide-y divide-white/10">
              {GROUPS.map((g) => {
                const items = grouped[g];
                const isEmpty = items.length === 0;
                const isOpen = expanded[g];
                return (
                  <div key={g}>
                    <button
                      onClick={() => !isEmpty && toggle(g)}
                      disabled={isEmpty}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                        isEmpty ? 'cursor-default' : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`text-sm font-medium ${isEmpty ? 'text-slate-600' : 'text-white'}`}>{g}</span>
                        <span className={`text-xs tabular-nums ${isEmpty ? 'text-slate-700' : 'text-slate-500'}`}>
                          {items.length}
                        </span>
                      </span>
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${
                          isEmpty ? 'text-slate-700' : 'text-slate-400'
                        } ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && !isEmpty && (
                      <div className="px-5 pb-2 divide-y divide-white/5">
                        {items.map((tt, i) => (
                          <TariffDetail key={i} tt={tt} group={g} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Deals */}
            {tariff.deals.length > 0 && (
              <div className="border-t border-white/10 p-5 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Deals</p>
                {tariff.deals.map((deal, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-sm font-medium text-white">{deal.name}</p>
                    {deal.announcement_date && (
                      <p className="text-xs text-slate-500">Announced {deal.announcement_date}</p>
                    )}
                    {deal.citation_url && (
                      <a
                        href={deal.citation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
                      >
                        <ExternalLink size={11} />
                        View source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
