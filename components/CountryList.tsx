'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Tariff } from '@/types/tariff';
import {
  TariffSelection, tariffForSelection, parseRate, MAX_SCALE_RATE,
} from '@/lib/tariffs';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, Search, MousePointerClick } from 'lucide-react';
import { SIZING_OPTIONS, SIZING_TOTAL } from '@/components/TreemapSizing';
import importsData from '@/data/imports_by_country_gtap.json';

interface CountryListProps {
  tariffs: Tariff[];
  selection: TariffSelection | null;
  selectedCountry: string | null;
  onCountrySelect: (tariff: Tariff | null) => void;
  sector: string;                       // import-volume column: dataset key to read
  onSectorChange: (key: string) => void;
}

type SortKey = 'name' | 'rate' | 'date' | 'imports';

// Status drives the rate cell's colour; magnitude is shown by bar length instead.
const STATUS_COLORS: Record<string, string> = {
  active: '#34d399', upcoming: '#60a5fa', expired: '#f87171',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Active', upcoming: 'Upcoming', expired: 'Expired',
};

type ImportRow = { code: string } & Record<string, number | string>;
const importRows = importsData.countries as ImportRow[];
const importsByCode: Record<string, ImportRow> = Object.fromEntries(importRows.map(c => [c.code, c]));

// Grid shared by the header and every row so columns line up. The selected
// tariff (authority) is constant across rows, so it's shown once as a caption
// rather than repeated in a column. Deals get their own layout: a Deal Type
// column and a narrower Status column (no rate bar).
const GRID_DEFAULT = 'minmax(180px,1.9fr) 1.4fr 1fr 1.4fr';
const GRID_DEAL = 'minmax(160px,1.5fr) 1.4fr 0.9fr 1fr 1.4fr';

// Short token shown in the import-volume header: "Total" for all sectors, else
// the sector's code ("oap (Animal Products Nec)" → "oap").
function sectorCode(sector: string): string {
  return sector === SIZING_TOTAL ? 'Total' : sector.split(' ')[0];
}

function importValue(code: string, sector: string): number {
  const row = importsByCode[code];
  const v = row ? Number(row[sector] ?? 0) : 0;
  return isNaN(v) ? 0 : v;
}

// Import figure: $B / $M / $K by magnitude (sectors span orders of magnitude).
function formatVolume(v: number): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

/** The selected tariff, labelled for the caption above the list. */
function authLabel(selection: TariffSelection): { main: string; sub: string } {
  if (selection.group === 'Deal') return { main: 'Deals', sub: '' };
  return { main: selection.group, sub: selection.group === 'Others' ? 'All other tariffs' : selection.key };
}

function fmtDate(d: string): string {
  if (!d || d === 'TBD') return 'TBD';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  // en-GB gives day-month-year order with a 2-digit day → "01 Jan 2026".
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Row {
  tariff: Tariff;
  applicable: boolean;
  rateText: string;       // "50%", "TBD", or "" (deals carry no numeric rate)
  rateFrac: number | null; // bar length 0–1, or null for TBD / no magnitude
  statusColor: string;
  statusLabel: string;
  dealType: string;       // deal view only
  date: string;
  sortRate: number;
  sortDate: string;
}

function buildRow(tariff: Tariff, selection: TariffSelection): Row {
  const base = { tariff };
  const blank = { applicable: false as const, rateText: '', rateFrac: null, statusColor: '', statusLabel: '', dealType: '', date: '', sortRate: -Infinity, sortDate: '' };

  // Deals aren't a tariff type — a country "matches" if it has any deal. The
  // Status column replaces Rate (no numeric rate, so no bar).
  if (selection.group === 'Deal') {
    const deal = tariff.deals[0];
    if (!deal) return { ...base, ...blank };
    const active = deal.status !== 'pending';
    return {
      ...base, applicable: true,
      rateText: '', rateFrac: null,
      statusColor: active ? STATUS_COLORS.active : STATUS_COLORS.upcoming,
      statusLabel: active ? 'Active' : 'Pending',
      dealType: deal.name,
      date: deal.announcement_date,
      sortRate: active ? 1 : 0,
      sortDate: deal.announcement_date,
    };
  }

  const match = tariffForSelection(tariff, selection);
  if (!match) return { ...base, ...blank };
  const n = parseRate(match.rate);
  return {
    ...base, applicable: true,
    rateText: n === null ? 'TBD' : match.rate,
    rateFrac: n === null ? null : Math.min(n, MAX_SCALE_RATE) / MAX_SCALE_RATE,
    statusColor: STATUS_COLORS[match.status] ?? STATUS_COLORS.active,
    statusLabel: STATUS_LABELS[match.status] ?? 'Active',
    dealType: '',
    date: match.effective_date,
    sortRate: n ?? -Infinity,
    sortDate: match.effective_date && match.effective_date !== 'TBD' ? match.effective_date : '',
  };
}

function SortHeader({ label, col, sort, dir, onSort, center }: { label: string; col: SortKey; sort: SortKey; dir: number; onSort: (c: SortKey) => void; center?: boolean }) {
  const active = sort === col;
  const Icon = !active ? ArrowUpDown : dir === 1 ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(col)}
      className={`flex items-center gap-1 whitespace-nowrap transition-colors ${center ? 'w-full justify-center' : 'text-left'} ${active ? 'text-slate-300' : 'text-slate-500 hover:text-slate-300'}`}
    >
      {label}
      <Icon size={12} className={active ? 'text-slate-300' : 'text-slate-600'} />
    </button>
  );
}

// Sector picker for the import-volume column. Mirrors TreemapSizing's behaviour
// (searchable list of the same SIZING_OPTIONS), styled to sit in the header.
function SectorFilter({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Open with a cleared search, then scroll the current selection to the top.
  const toggle = () => {
    if (open) { setOpen(false); return; }
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => {
      const menu = menuRef.current, sel = selectedRef.current;
      if (menu && sel) menu.scrollTop = sel.offsetTop;
    });
  };

  const current = SIZING_OPTIONS.find(o => o.key === value) ?? SIZING_OPTIONS[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIZING_OPTIONS;
    return SIZING_OPTIONS.filter(o => o.label.toLowerCase().includes(q));
  }, [query]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={toggle}
        aria-label="Choose sector"
        title={current.label}
        className={`inline-flex items-center gap-0.5 border-b border-dashed transition-colors ${
          open ? 'text-white border-slate-300' : 'text-slate-200 border-slate-500 hover:text-white hover:border-slate-300'
        }`}
      >
        {sectorCode(value)}
        <ChevronDown size={11} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-60 rounded-lg border border-white/10 bg-[#0f172a] shadow-xl shadow-black/40 overflow-hidden">
          <div className="relative border-b border-white/10">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sectors…"
              className="w-full bg-transparent pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none normal-case tracking-normal"
            />
          </div>
          <div ref={menuRef} className="relative max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500">No sectors match “{query.trim()}”.</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.key}
                  ref={o.key === value ? selectedRef : undefined}
                  onClick={() => { onChange(o.key); setOpen(false); }}
                  className={`w-full flex items-center px-3 py-2 text-left text-xs normal-case tracking-normal transition-colors ${
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

// Deal view: a status dot + label, no bar (deals have no numeric rate).
function StatusCell({ row }: { row: Row }) {
  if (!row.applicable) return <span className="text-xs text-slate-600">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: row.statusColor }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.statusColor }} />
      {row.statusLabel}
    </span>
  );
}

function RateCell({ row }: { row: Row }) {
  if (!row.applicable) return <span className="text-xs text-slate-600">n/a</span>;
  return (
    <div className="min-w-0">
      <div className={`flex items-baseline gap-2 mb-1.5 ${row.rateText ? 'justify-between' : ''}`}>
        {row.rateText && <span className="text-[13px] font-medium text-slate-100">{row.rateText}</span>}
        <span className="text-[10px]" style={{ color: row.statusColor }}>{row.statusLabel}</span>
      </div>
      {row.rateFrac === null ? (
        <div
          className="h-[5px] rounded-full"
          style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 4px, transparent 4px 8px)' }}
        />
      ) : (
        <div className="h-[5px] rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(row.rateFrac * 100)}%`, backgroundColor: row.statusColor }}
          />
        </div>
      )}
    </div>
  );
}

export default function CountryList({ tariffs, selection, selectedCountry, onCountrySelect, sector, onSectorChange }: CountryListProps) {
  const [sort, setSort] = useState<SortKey>('rate');
  const [dir, setDir] = useState<number>(-1); // 1 asc, -1 desc

  const selectedRowRef = useRef<HTMLButtonElement | null>(null);
  const setSelectedRow = useCallback((el: HTMLButtonElement | null) => { selectedRowRef.current = el; }, []);

  const onSort = (col: SortKey) => {
    if (sort === col) setDir(d => -d);
    else { setSort(col); setDir(col === 'rate' || col === 'imports' ? -1 : 1); }
  };

  const rows = useMemo(() => {
    if (!selection) return [];
    const built = tariffs.map(t => buildRow(t, selection));
    const cmp = (a: Row, b: Row): number => {
      // For tariff-derived columns, countries with no match under the selection
      // sink to the bottom; import volume is independent of the tariff, so it
      // sorts across all rows.
      if (sort !== 'imports' && a.applicable !== b.applicable) return a.applicable ? -1 : 1;
      let av: string | number, bv: string | number;
      if (sort === 'name') { av = a.tariff.country.toLowerCase(); bv = b.tariff.country.toLowerCase(); }
      else if (sort === 'rate') { av = a.sortRate; bv = b.sortRate; }
      else if (sort === 'imports') { av = importValue(a.tariff.country_code, sector); bv = importValue(b.tariff.country_code, sector); }
      else { av = a.sortDate; bv = b.sortDate; }
      return av < bv ? -dir : av > bv ? dir : 0;
    };
    return built.sort(cmp);
  }, [tariffs, selection, sort, dir, sector]);

  // Scroll the selected row into view when selection comes from elsewhere
  // (search box, panel) — the list's equivalent of the map centering a country.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedCountry, sort, dir, selection]);

  if (!selection) {
    return (
      <div className="w-full h-full bg-[#0a0f1e] flex flex-col items-center justify-center text-center px-8">
        <MousePointerClick size={28} className="text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-300">Select a tariff to see rates</p>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs">
          Choose a tariff in the legend to compare rates, effective dates, and import volumes across countries.
        </p>
      </div>
    );
  }

  const caption = authLabel(selection);
  const ImpSortIcon = sort !== 'imports' ? ArrowUpDown : dir === 1 ? ArrowUp : ArrowDown;
  const isDeal = selection.group === 'Deal';
  const grid = isDeal ? GRID_DEAL : GRID_DEFAULT;

  return (
    <div className="w-full h-full bg-[#0a0f1e] flex flex-col">
      {/* Header */}
      <div
        className="grid gap-3 px-4 py-2.5 border-y border-white/10 text-[11px] uppercase tracking-wider flex-shrink-0 items-center"
        style={{ gridTemplateColumns: grid }}
      >
        <SortHeader label="Country" col="name" sort={sort} dir={dir} onSort={onSort} />
        {isDeal && <span className="text-slate-500">Deal Type</span>}
        <SortHeader label={isDeal ? 'Status' : 'Rate'} col="rate" sort={sort} dir={dir} onSort={onSort} />
        <SortHeader label={isDeal ? 'Announced' : 'Effective Date'} col="date" sort={sort} dir={dir} onSort={onSort} center />
        {/* Import volume: a toggleable sector token ("Total" / sector code) + a
            static label, with the sort control next to it — all on one line. */}
        <div className="flex items-center justify-center gap-1.5 min-w-0 normal-case tracking-normal">
          <SectorFilter value={sector} onChange={onSectorChange} />
          <button
            onClick={() => onSort('imports')}
            className={`flex items-center gap-1 whitespace-nowrap transition-colors ${sort === 'imports' ? 'text-slate-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Exports to US
            <ImpSortIcon size={12} className={sort === 'imports' ? 'text-slate-300' : 'text-slate-600'} />
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {rows.map(r => {
          const isSelected = selectedCountry === r.tariff.country_code;
          const vol = formatVolume(importValue(r.tariff.country_code, sector));
          return (
            <button
              key={r.tariff.country_code}
              ref={isSelected ? setSelectedRow : undefined}
              onClick={() => onCountrySelect(isSelected ? null : r.tariff)}
              className={`grid gap-3 w-full items-center px-4 py-3 text-left border-b border-white/[0.06] transition-colors ${
                isSelected ? 'bg-emerald-500/[0.12] ring-1 ring-inset ring-emerald-400/40' : 'hover:bg-white/5'
              }`}
              style={{ gridTemplateColumns: grid }}
            >
              {/* Country */}
              <span className="flex items-center gap-2.5 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.com/${r.tariff.country_code.toLowerCase()}.svg`}
                  alt=""
                  className="w-5 h-auto rounded-sm flex-shrink-0 ring-1 ring-white/10"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
                <span className="text-sm text-slate-100 truncate">{r.tariff.country}</span>
              </span>

              {/* Deal Type (deal view only) */}
              {isDeal && (
                <span className="text-xs text-slate-300 truncate">
                  {r.applicable && r.dealType ? r.dealType : <span className="text-slate-600">—</span>}
                </span>
              )}

              {/* Rate / Status */}
              {isDeal ? <StatusCell row={r} /> : <RateCell row={r} />}

              {/* Effective date / Announced */}
              <span className="text-xs text-slate-400 whitespace-nowrap text-center">
                {r.applicable ? fmtDate(r.date) : <span className="text-slate-600">—</span>}
              </span>

              {/* Import volume */}
              <span className={`text-xs tabular-nums text-center ${vol === '—' ? 'text-slate-600' : 'text-slate-300'}`}>
                {vol}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
