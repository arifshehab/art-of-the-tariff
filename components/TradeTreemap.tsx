'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Tariff } from '@/types/tariff';
import { TariffSelection, rateForSelection } from '@/lib/tariffs';
import importsData from '@/data/total_imports.json';

const MIN_total_imports = 3000000000; // countries below this are omitted

/** Pick a readable text color (dark or light) for a given hex background. */
function textOn(hex: string): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#0a0f1e' : '#f8fafc';
}

interface TradeTreemapProps {
  tariffs: Tariff[];
  countryColors: Record<string, string>;
  selection: TariffSelection | null;
  onCountrySelect: (tariff: Tariff | null) => void;
  selectedCountry: string | null;
}

interface HoverTooltip {
  name: string;
  rate: string | null;
  x: number;
  y: number;
}

type RegionKey = 'na' | 'sa' | 'eu' | 'af' | 'me' | 'as' | 'oc';

interface RegionConfig {
  label: string;
  fill: string;
  fill2: string;
  text: string;
}

const REGIONS: Record<RegionKey, RegionConfig> = {
  na: { label: 'North America', fill: '#0C447C', fill2: '#185FA5', text: '#E6F1FB' },
  sa: { label: 'South America', fill: '#712B13', fill2: '#993C1D', text: '#FAECE7' },
  eu: { label: 'Europe',        fill: '#3C3489', fill2: '#534AB7', text: '#EEEDFE' },
  af: { label: 'Africa',        fill: '#633806', fill2: '#854F0B', text: '#FAEEDA' },
  me: { label: 'Middle East',   fill: '#72243E', fill2: '#993556', text: '#FBEAF0' },
  as: { label: 'Asia',          fill: '#085041', fill2: '#0F6E56', text: '#E1F5EE' },
  oc: { label: 'Oceania',       fill: '#444441', fill2: '#5F5E5A', text: '#F1EFE8' },
};

const REGION_SHORT: Partial<Record<RegionKey, string>> = {
  na: 'N. America',
  sa: 'S. America',
};

// uppercase + tracking-widest at 10px ≈ 8px per character
const LABEL_CH_PX = 8;

function regionLabel(key: RegionKey, availPx: number): string {
  const full = REGIONS[key].label;
  if (full.length * LABEL_CH_PX <= availPx) return full;
  const short = REGION_SHORT[key];
  if (short && short.length * LABEL_CH_PX <= availPx) return short;
  const fallback = key.toUpperCase();
  if (fallback.length * LABEL_CH_PX <= availPx) return fallback;
  return '';
}

/**
 * Three-column layout with 1% gaps:
 *   col1: NA (top) / SA (bottom)
 *   col2: EU (top) / AF+ME (bottom, split horizontally)
 *   col3: AS (top) / OC (bottom)
 * Column widths and all height/width splits are proportional to import totals.
 */
function computeRegionBoxes(t: Record<string, number>): Record<string, [number, number, number, number]> {
  const COL_GAP = 2;  // horizontal gap between columns (%)
  const ROW_GAP = 5;  // vertical gap between top/bottom rows within a column (%)
  const TOP = 5;      // top margin for first-row labels (%)

  const na = t.na ?? 0, sa = t.sa ?? 0;
  const eu = t.eu ?? 0, af = t.af ?? 0, me = t.me ?? 0;
  const as = t.as ?? 0, oc = t.oc ?? 0;

  const c1 = na + sa, c2 = eu + af + me, c3 = as + oc;
  const total = c1 + c2 + c3 || 1;
  const availW = 100 - 2 * COL_GAP;
  const availH = 100 - TOP - ROW_GAP;

  const w1 = availW * c1 / total;
  const w2 = availW * c2 / total;
  const w3 = availW * c3 / total;
  const x1 = 0, x2 = w1 + COL_GAP, x3 = w1 + COL_GAP + w2 + COL_GAP;

  const naH = c1 ? availH * na / c1 : availH / 2;
  const saH = availH - naH;

  const euH = c2 ? availH * eu / c2 : availH / 2;
  const afmeH = availH - euH;
  const afW = (af + me) ? w2 * af / (af + me) : w2 / 2;
  const meW = w2 - afW;

  // OC is half the column width, so heights are solved to keep pixel areas proportional:
  // w3*asH / as = (w3/2)*ocH / oc  →  asH + ocH = availH
  const ocH = c3 ? availH * 2 * oc / (as + 2 * oc) : availH / 2;
  const asH = availH - ocH;

  const rowY1 = TOP + naH + ROW_GAP;
  const rowY2 = TOP + euH + ROW_GAP;
  const rowY3 = TOP + asH + ROW_GAP;

  return {
    na: [x1, TOP,   w1,  naH],
    sa: [x1, rowY1, w1,  saH],
    eu: [x2, TOP,   w2,  euH],
    af: [x2, rowY2, afW, afmeH],
    me: [x2 + afW,  rowY2, meW, afmeH],
    as: [x3, TOP,   w3,   asH],
    oc: [x3, rowY3, w3/2, ocH],
  };
}

// Minimum cell area (px²) — about enough to fit a 2-letter country code.
const MIN_CELL_AREA = 22 * 20;

// Mobile: layout is computed at this base canvas size (the max-zoom / legible
// level); pinch-zoom scales it down to fit-all (min zoom).
const BASE_W = 820;
const BASE_H = 720;

interface ImportCountry {
  code: string;
  country_name: string;
  region: string;
  total_imports: number;
}

interface LaidOutRect {
  country: ImportCountry;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Squarified treemap (Bruls, Huizing & van Wijk): lays items into rows along the
// shorter side, keeping each rectangle's aspect ratio close to 1 so labels fit.
function layoutTreemap(items: ImportCountry[], X: number, Y: number, W: number, H: number, out: LaidOutRect[], minArea = 0) {
  if (items.length === 0) return;
  const A = W * H;
  const vals = items.map(i => i.total_imports);

  // Cells stay proportional to value, except any whose proportional area would be
  // below minArea are floored to minArea; the rest share the remaining area.
  const floored = new Array(items.length).fill(false);
  for (let iter = 0; iter < 12; iter++) {
    const used = floored.reduce((s, f) => s + (f ? minArea : 0), 0);
    const freeSum = vals.reduce((s, v, i) => s + (floored[i] ? 0 : v), 0) || 1;
    const scale = Math.max(A - used, 0) / freeSum;
    let changed = false;
    for (let i = 0; i < vals.length; i++) {
      if (!floored[i] && vals[i] * scale < minArea) { floored[i] = true; changed = true; }
    }
    if (!changed) break;
  }
  const used = floored.reduce((s, f) => s + (f ? minArea : 0), 0);
  const freeSum = vals.reduce((s, v, i) => s + (floored[i] ? 0 : v), 0) || 1;
  const scale = Math.max(A - used, 0) / freeSum;
  const areas = vals.map((v, i) => (floored[i] ? minArea : v * scale));

  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    const rmax = Math.max(...row);
    const rmin = Math.min(...row);
    return Math.max((side * side * rmax) / (s * s), (s * s) / (side * side * rmin));
  };

  let x = X, y = Y, w = W, h = H;
  let row: number[] = [];
  let rowItems: ImportCountry[] = [];

  const place = () => {
    const s = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      const colW = s / h;
      let oy = y;
      row.forEach((a, k) => {
        const cellH = a / colW;
        out.push({ country: rowItems[k], x, y: oy, w: colW, h: cellH });
        oy += cellH;
      });
      x += colW; w -= colW;
    } else {
      const rowH = s / w;
      let ox = x;
      row.forEach((a, k) => {
        const cellW = a / rowH;
        out.push({ country: rowItems[k], x: ox, y, w: cellW, h: rowH });
        ox += cellW;
      });
      y += rowH; h -= rowH;
    }
    row = [];
    rowItems = [];
  };

  let i = 0;
  while (i < areas.length) {
    const side = Math.min(w, h);
    if (row.length === 0 || worst(row, side) >= worst([...row, areas[i]], side)) {
      row.push(areas[i]);
      rowItems.push(items[i]);
      i++;
    } else {
      place();
    }
  }
  if (row.length) place();
}

export default function TradeTreemap({ tariffs, countryColors, selection, onCountrySelect, selectedCountry }: TradeTreemapProps) {
  const viewportRef = useRef<HTMLDivElement>(null); // outer scroll / pinch area
  const containerRef = useRef<HTMLDivElement>(null); // inner positioned canvas
  const [measured, setMeasured] = useState({ w: 1200, h: 700 }); // desktop canvas size
  const [vp, setVp] = useState({ w: 0, h: 0 });                   // viewport size (mobile fit)
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<HoverTooltip | null>(null);

  // Mobile detection.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Measure the inner canvas (desktop layout) and the viewport (mobile fit).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const o = new ResizeObserver(es => {
      const { width, height } = es[0].contentRect;
      if (width > 0 && height > 0) setMeasured({ w: width, h: height });
    });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const o = new ResizeObserver(es => {
      const { width, height } = es[0].contentRect;
      if (width > 0 && height > 0) setVp({ w: width, h: height });
    });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  // Min zoom = fit the whole canvas in the viewport; max zoom = 1 (base size).
  const fitScale = vp.w && vp.h ? Math.min(vp.w / BASE_W, vp.h / BASE_H, 1) : 1;
  useEffect(() => { if (isMobile) setZoom(fitScale); }, [isMobile]); // start zoomed-out (show all)
  useEffect(() => { setZoom(z => Math.min(Math.max(z, fitScale), 1)); }, [fitScale]);

  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const fitRef = useRef(fitScale); fitRef.current = fitScale;
  const isMobileRef = useRef(isMobile); isMobileRef.current = isMobile;

  // Pinch-to-zoom (two fingers); one finger pans via native scroll.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { startDist = dist(e.touches); startZoom = zoomRef.current; }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const next = Math.min(Math.max(startZoom * (dist(e.touches) / startDist), fitRef.current), 1);
        setZoom(next);
      }
    };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) startDist = 0; };
    // Trackpad pinch (and ctrl+scroll) fire a wheel event with ctrlKey set.
    const onWheel = (e: WheelEvent) => {
      if (!isMobileRef.current) return;
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = Math.min(Math.max(zoomRef.current * Math.exp(-e.deltaY * 0.01), fitRef.current), 1);
      setZoom(next);
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const tariffByCode = useMemo(() => {
    const map: Record<string, Tariff> = {};
    for (const t of tariffs) map[t.country_code] = t;
    return map;
  }, [tariffs]);

  const layoutW = isMobile ? BASE_W : measured.w;
  const layoutH = isMobile ? BASE_H : measured.h;

  const regions = useMemo(() => {
    const grouped: Record<string, ImportCountry[]> = {};
    for (const c of importsData.countries as ImportCountry[]) {
      if (c.total_imports < MIN_total_imports) continue;
      (grouped[c.region] ??= []).push(c);
    }
    const totals: Record<string, number> = {};
    for (const key of Object.keys(REGIONS)) {
      totals[key] = (grouped[key] ?? []).reduce((s, c) => s + c.total_imports, 0);
    }
    const boxes = computeRegionBoxes(totals);
    return (Object.keys(REGIONS) as RegionKey[]).map(key => {
      const cfg = REGIONS[key];
      const box = boxes[key] ?? [0, 0, 0, 0] as [number, number, number, number];
      const items = (grouped[key] ?? []).sort((a, b) => b.total_imports - a.total_imports);
      const pxW = (box[2] / 100) * layoutW;
      const pxH = (box[3] / 100) * layoutH;
      const rects: LaidOutRect[] = [];
      layoutTreemap(items, 0, 0, pxW, pxH, rects, 0);
      return { key, cfg, box, rects, pxW, pxH };
    });
  }, [layoutW, layoutH, isMobile]);

  const renderScale = isMobile ? zoom : 1;

  return (
    <div
      ref={viewportRef}
      className="w-full h-full bg-[#0a0f1e] overflow-auto p-4 md:p-6"
      style={isMobile ? { touchAction: 'pan-x pan-y' } : undefined}
    >
      <div
        ref={containerRef}
        className={isMobile ? 'relative' : 'relative w-full h-full'}
        style={
          isMobile
            ? { width: BASE_W * zoom, height: BASE_H * zoom }
            : undefined
        }
      >
        {regions.map(({ key, cfg, box, rects, pxW, pxH }) => {
          const [bx, by, bw, bh] = box;
          return (
            <div key={key}>
              {/* Region label */}
              {(() => {
                const label = regionLabel(key, (bw / 100) * layoutW * renderScale);
                return label ? (
                  <span
                    className="absolute text-[10px] uppercase tracking-widest text-slate-500 whitespace-nowrap"
                    style={{ left: `${bx}%`, top: `${by}%`, transform: 'translateY(-105%)' }}
                  >
                    {label}
                  </span>
                ) : null;
              })()}

              {rects.map(({ country, x, y, w, h }, idx) => {
                // rects are region-px; rendered px also factor in the mobile zoom.
                const wPx = w * renderScale;
                const hPx = h * renderScale;
                const leftPct = bx + (pxW ? (x / pxW) * bw : 0);
                const topPct = by + (pxH ? (y / pxH) * bh : 0);
                const wPct = pxW ? (w / pxW) * bw : 0;
                const hPct = pxH ? (h / pxH) * bh : 0;

                // Label priority: name + volume → code + volume → code only.
                // A name may wrap to a 2nd line only if it has 2+ words.
                // Space available is the box minus its padding (12px x, 8px y for the
                // padded tiers; 6px x, 4px y for the bare code tier).
                const amountText = `$${Math.round(country.total_imports/1000000000)}B`;
                const NAME_CH = 6.4, CODE_CH = 7, AMT_CH = 6, NAME_LH = 14, CODE_LH = 14, AMT_LH = 13;
                const displayName = country.country_name.split('(')[0].trim();
                const words = displayName.split(' ');
                const isMultiWord = words.length >= 2;
                const longestWord = Math.max(...words.map(w => w.length));

                const availW = wPx - 12;
                const availH = hPx - 8;
                const amtW = amountText.length * AMT_CH;
                const codeW = country.code.length * CODE_CH;

                const oneLine = availW >= displayName.length * NAME_CH;
                const nameFitsWidth = oneLine || (isMultiWord && availW >= longestWord * NAME_CH);
                const nameLines = oneLine ? 1 : 2;

                const fitsNameAmount =
                  nameFitsWidth && availW >= amtW && availH >= nameLines * NAME_LH + AMT_LH;
                const fitsCodeAmount =
                  availW >= Math.max(codeW, amtW) && availH >= CODE_LH + AMT_LH;
                // Code-only tier uses the smaller padding; below this, show no text.
                const fitsCode = wPx - 6 >= codeW && hPx - 4 >= CODE_LH;

                const tariff = tariffByCode[country.code];
                const isSelected = selectedCountry === country.code;

                // When a tariff filter is active, fill by rate color (like the map);
                // otherwise by region color.
                const rate = selection && tariff ? rateForSelection(tariff, selection) : null;
                const fill = selection
                  ? (countryColors[country.code] ?? '#c0c0c0')
                  : (idx % 2 ? cfg.fill2 : cfg.fill);
                const textColor = selection ? textOn(fill) : cfg.text;

                return (
                  <button
                    key={country.code}
                    onClick={() => onCountrySelect(tariff ?? null)}
                    onMouseMove={isMobile ? undefined : (e) => {
                      const r = containerRef.current?.getBoundingClientRect();
                      setTooltip({
                        name: displayName,
                        rate: selection ? rate : amountText,
                        x: e.clientX - (r?.left ?? 0),
                        y: e.clientY - (r?.top ?? 0),
                      });
                    }}
                    onMouseLeave={isMobile ? undefined : () => setTooltip(null)}
                    className="absolute box-border overflow-hidden rounded-[3px] text-left transition-all duration-150 hover:brightness-125 focus:outline-none"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${wPct}%`,
                      height: `${hPct}%`,
                      backgroundColor: fill,
                      border: isSelected ? '2px solid #ffffff' : '1.5px solid rgba(0,0,0,0.45)',
                      padding: fitsNameAmount || fitsCodeAmount ? '4px 6px' : '2px 3px',
                      color: textColor,
                      cursor: tariff ? 'pointer' : 'default',
                    }}
                  >
                    {fitsNameAmount ? (
                      <>
                        <div className={`text-[12px] font-medium leading-tight ${isMultiWord ? 'whitespace-normal' : 'whitespace-nowrap'}`}>{displayName}</div>
                        <div className="text-[10px] opacity-75 leading-tight">{amountText}</div>
                      </>
                    ) : fitsCodeAmount ? (
                      <>
                        <div className="text-[12px] font-medium leading-tight">{country.code}</div>
                        <div className="text-[10px] opacity-75 leading-tight">{amountText}</div>
                      </>
                    ) : fitsCode ? (
                      <div className="text-[10px] font-medium leading-none">{country.code}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}

        {!isMobile && tooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-[#0f172a] border border-white/10 rounded-md px-2.5 py-1.5"
            style={(() => {
              const onRight = tooltip.x > measured.w * 0.6;
              const onBottom = tooltip.y > measured.h - 70;
              return {
                left: onRight ? tooltip.x - 12 : tooltip.x + 12,
                top: onBottom ? tooltip.y - 12 : tooltip.y + 12,
                transform: [onRight && 'translateX(-100%)', onBottom && 'translateY(-100%)'].filter(Boolean).join(' ') || undefined,
              };
            })()}
          >
            <p className="text-xs font-medium text-white whitespace-nowrap">{tooltip.name}</p>
            {tooltip.rate && (
              <p className="text-[11px] text-slate-400 whitespace-nowrap">{tooltip.rate}</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
