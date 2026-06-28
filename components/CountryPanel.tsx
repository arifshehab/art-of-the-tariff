'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tariff, TariffStatus, TariffType } from '@/types/tariff';
import { DEAL_KEY, getMergedTariffTypes, groupOf, matchesSelection, mergeCategories, selectionFor, TARIFF_GROUPS, TariffGroup, TariffSelection } from '@/lib/tariffs';
import { ChevronDown, ExternalLink, MousePointerClick, X } from 'lucide-react';
import importsData from '@/data/imports_by_country_gtap.json';

interface CountryPanelProps {
  tariff: Tariff | null;
  selection?: TariffSelection | null;
  sector: string; // dataset key for the exports figure shown in the header
  onClose: () => void;
  onSelectFilter?: (selection: TariffSelection | null) => void;
}

const STATUS_CONFIG: Record<TariffStatus, { label: string; className: string }> = {
  active:   { label: 'Active',   className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  expired:  { label: 'Expired',  className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
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

function TariffDetail({ tt, group, onSelect, highlighted, innerRef }: { tt: TariffType; group: GroupName; onSelect?: () => void; highlighted?: boolean; innerRef?: (el: HTMLDivElement | null) => void }) {
  const showAppliesTo = group === 'Others' || !!tt.sub_category;
  return (
    <div
      ref={innerRef}
      className={`space-y-3 py-3 -mx-2 px-2 rounded-lg transition-colors ${onSelect ? 'cursor-pointer hover:bg-white/5' : ''} ${highlighted ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
      onClick={onSelect}
      title={onSelect ? 'Click to visualise this tariff on the map' : undefined}
    >
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
            {tt.status === 'upcoming' ? 'Proposed Date' : 'Effective Date'}
          </p>
          <p className="text-sm text-slate-300">{tt.effective_date === 'TBD' ? 'To be determined' : tt.effective_date}</p>
        </div>
      )}
      {tt.citation_url && (
        <a
          href={tt.citation_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors"
        >
          <ExternalLink size={12} />
          View source
        </a>
      )}
    </div>
  );
}

type ImportRow = { code: string } & Record<string, number | string>;

const importsByCode: Record<string, ImportRow> = Object.fromEntries(
  (importsData.countries as ImportRow[]).map(c => [c.code, c])
);

const importsYear = new Date(importsData.last_updated).getFullYear();

// Exports figure: $B / $M / $K depending on magnitude (sectors span orders of magnitude).
function formatExports(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

// Header prefix for the exports line: "Total" for all sectors, else the 3-letter
// sector code ("pfb (Plant-Based Fibers)" → "pfb").
function exportsLabel(sector: string): string {
  return sector === 'total_imports' ? 'Total' : sector.split(' ')[0];
}

export default function CountryPanel({ tariff, selection, sector, onClose, onSelectFilter }: CountryPanelProps) {
  const [expanded, setExpanded] = useState<Record<GroupName, boolean>>({
    'Section 122': false, 'Section 232': false, 'Section 301': false, 'Others': false,
  });

  // Tracks the currently-highlighted row's element (null when none renders).
  const highlightElRef = useRef<HTMLDivElement | null>(null);
  const setHighlightEl = useCallback((el: HTMLDivElement | null) => {
    highlightElRef.current = el;
  }, []);

  // When a country opens: if a tariff filter is active, expand its group so the
  // matching tariff is visible; otherwise collapse all groups.
  useEffect(() => {
    const base = { 'Section 122': false, 'Section 232': false, 'Section 301': false, 'Others': false };
    if (selection && selection.group !== 'Deal') base[selection.group] = true;
    setExpanded(base);
  }, [tariff?.country_code, selection]);

  // Auto-scroll to the highlighted row after render. Runs on every country/filter
  // change; does nothing if no matching row exists (ref is null).
  useEffect(() => {
    if (!selection) return;
    const id = requestAnimationFrame(() => {
      highlightElRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [tariff?.country_code, selection]);

  const visibleTypes = tariff ? mergeCategories(getMergedTariffTypes(tariff)) : [];
  const grouped: Record<GroupName, TariffType[]> = {
    'Section 122': [], 'Section 232': [], 'Section 301': [], 'Others': [],
  };
  for (const tt of visibleTypes) grouped[groupOf(tt)].push(tt);

  // Sort entries alphabetically within each group by their displayed label.
  const sortKey = (tt: TariffType) =>
    (groupOf(tt) === 'Others' ? tt.name : tt.sub_category ?? tt.product_category).toLowerCase();
  for (const g of GROUPS) grouped[g].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  const toggle = (g: GroupName) =>
    setExpanded(prev => ({ ...prev, [g]: !prev[g] }));

  const nonEmptyGroups = GROUPS.filter(g => grouped[g].length > 0);
  // "Collapse all" as soon as any section is open; "Expand all" only when none are.
  const anyExpanded = nonEmptyGroups.some(g => expanded[g]);

  const setAll = (open: boolean) =>
    setExpanded({
      'Section 122': open, 'Section 232': open, 'Section 301': open, 'Others': open,
    });

  return (
    <div className="flex flex-col md:flex-1 md:min-h-0">
      {!tariff ? (
        <div className="flex flex-col items-center justify-center text-center px-8 py-16 md:py-0 md:flex-1">
          <MousePointerClick size={28} className="text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-300">No country selected</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Search for a country or click it on the map to view its tariffs and trade deals.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.com/${tariff.country_code.toLowerCase()}.svg`}
                  alt=""
                  className="w-6 h-auto rounded-sm flex-shrink-0 ring-1 ring-white/10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <h2 className="text-xl font-semibold text-white">{tariff.country}</h2>
              </div>
              {importsByCode[tariff.country_code]?.[sector] != null && (
                <p className="text-xs text-slate-400">
                  {exportsLabel(sector)} Exports to US ({importsYear}): <span className="text-white font-medium">{formatExports(Number(importsByCode[tariff.country_code][sector]))}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={onClose}
                className="mt-1 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
              {nonEmptyGroups.length > 0 && (
                <button
                  onClick={() => setAll(!anyExpanded)}
                  className="text-xs text-slate-500 hover:text-white transition-colors whitespace-nowrap"
                >
                  {anyExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="md:flex-1 md:overflow-y-auto">

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
                        {items.map((tt, i) => {
                          const isHighlighted = !!selection && matchesSelection(tt, selection);
                          return (
                            <TariffDetail
                              key={i}
                              tt={tt}
                              group={g}
                              highlighted={isHighlighted}
                              innerRef={isHighlighted ? setHighlightEl : undefined}
                              onSelect={onSelectFilter ? () => onSelectFilter(isHighlighted ? null : selectionFor(tt)) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Deals */}
            {tariff.deals.length > 0 && (
              <div className="border-t border-white/10 p-5 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Deals</p>
                {tariff.deals.map((deal, i) => {
                  const highlighted = selection?.group === 'Deal';
                  const onSelect = onSelectFilter ? () => onSelectFilter(highlighted ? null : { group: 'Deal', key: DEAL_KEY }) : undefined;
                  return (
                    <div
                      key={i}
                      ref={highlighted && i === 0 ? setHighlightEl : undefined}
                      onClick={onSelect}
                      title={onSelect ? 'Click to visualise deals on the map' : undefined}
                      className={`space-y-1 -mx-2 px-2 py-2 rounded-lg transition-colors ${onSelect ? 'cursor-pointer hover:bg-white/5' : ''} ${highlighted ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
                    >
                      <p className="text-sm font-medium text-white">{deal.name}</p>
                      {deal.announcement_date && (
                        <p className="text-xs text-slate-500">Announced {deal.announcement_date}</p>
                      )}
                      {deal.citation_url && (
                        <a
                          href={deal.citation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
                        >
                          <ExternalLink size={11} />
                          View source
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
