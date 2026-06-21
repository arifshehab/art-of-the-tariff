'use client';

import { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { SERIES, OVERALL, DATES } from '@/data/timeline';

const ALL = [...SERIES, { ...OVERALL, isAvg: true }];
const VW = 760, VH = 440, M = { top: 20, right: 64, bottom: 34, left: 44 };
const IW = VW - M.left - M.right;
const IH = VH - M.top - M.bottom;

const fmtDate = (s: string) => d3.utcFormat('%b %Y')(new Date(s + 'T00:00:00Z'));
const fmtDay = (s: string) => d3.utcFormat('%d %b %Y')(new Date(s + 'T00:00:00Z'));
const quarterId = (s: string) => {
  const dt = new Date(s + 'T00:00:00Z');
  return dt.getUTCFullYear() * 4 + Math.floor(dt.getUTCMonth() / 3);
};

export default function ExploreChart() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [scrub, setScrub] = useState(DATES.length - 1);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = DATES.length;
  const x = useMemo(() => d3.scaleLinear().domain([0, n - 1]).range([M.left, M.left + IW]), [n]);

  const visible = ALL.filter(s => !hidden.has(s.code));
  const maxV = d3.max(visible, s => d3.max(s.values)) ?? 40;
  const y = d3.scaleLinear().domain([0, Math.max(10, Math.ceil(maxV / 10) * 10)]).range([M.top + IH, M.top]);
  const line = d3.line<number>().x((_, i) => x(i)).y(v => y(v)).curve(d3.curveMonotoneX);

  const guide = hover ?? scrub;
  const yTicks = y.ticks(5);

  const toggle = (code: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else { next.add(code); if (selected === code) setSelected(null); }
      return next;
    });
  };

  const onMove = (e: React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * VW;
    const i = Math.max(0, Math.min(n - 1, Math.round(x.invert(px))));
    setHover(i);
  };

  // Tooltip rows at the guide date (visible series, sorted high→low)
  const tipRows = visible
    .map(s => ({ code: s.code, name: s.name, color: s.color, v: s.values[guide], isAvg: 'isAvg' in s }))
    .sort((a, b) => b.v - a.v);

  // Selected-country stats
  const sel = selected ? ALL.find(s => s.code === selected) : null;
  const stats = useMemo(() => {
    if (!sel) return null;
    const v = sel.values;
    const cur = v[v.length - 1];
    const start = v[0];
    const peakIdx = v.indexOf(Math.max(...v));
    const countriesCur = SERIES.map(s => ({ code: s.code, cur: s.values[s.values.length - 1] }))
      .sort((a, b) => b.cur - a.cur);
    const rank = countriesCur.findIndex(c => c.code === sel.code) + 1;
    const avgCur = OVERALL.values[OVERALL.values.length - 1];
    return {
      cur, start, change: cur - start,
      peak: v[peakIdx], peakDate: DATES[peakIdx],
      rank, total: SERIES.length, vsAvg: cur - avgCur,
      isAvg: 'isAvg' in sel,
    };
  }, [sel]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Chart side */}
      <div className="flex-1 min-w-0 w-full">
        {/* Legend toggles */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ALL.map(s => {
            const off = hidden.has(s.code);
            const isAvg = 'isAvg' in s;
            return (
              <button
                key={s.code}
                onClick={() => toggle(s.code)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border transition-colors ${
                  off ? 'border-white/5 text-slate-600' : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span
                  className={isAvg ? 'w-3.5 border-t-2 border-dashed' : 'w-2.5 h-2.5 rounded-sm'}
                  style={{ backgroundColor: isAvg ? undefined : (off ? '#475569' : s.color), borderColor: isAvg ? (off ? '#475569' : s.color) : undefined }}
                />
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            className="w-full h-auto"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label="Interactive line chart of effective tariff rates by country."
          >
            {yTicks.map(t => (
              <g key={t}>
                <line x1={M.left} x2={M.left + IW} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" />
                <text x={M.left - 6} y={y(t) + 3} textAnchor="end" fill="#64748b" fontSize={11}>{t}%</text>
              </g>
            ))}
            {DATES.map((d, i) => (i === 0 || quarterId(d) !== quarterId(DATES[i - 1])) ? (
              <text key={d} x={x(i)} y={M.top + IH + 18} textAnchor="middle" fill="#64748b" fontSize={10}>{fmtDate(d)}</text>
            ) : null)}

            {/* Guide line */}
            <line x1={x(guide)} x2={x(guide)} y1={M.top} y2={M.top + IH} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />

            {/* Lines */}
            {visible.map(s => {
              const isAvg = 'isAvg' in s;
              const dim = selected !== null && selected !== s.code;
              return (
                <path
                  key={s.code}
                  d={line(s.values) ?? ''}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={selected === s.code ? 3.5 : isAvg ? 3 : 2.2}
                  strokeDasharray={isAvg ? '8 4' : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={dim ? 0.18 : 1}
                />
              );
            })}

            {/* Wide invisible hit paths for click/select */}
            {visible.map(s => (
              <path
                key={'hit-' + s.code}
                d={line(s.values) ?? ''}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(selected === s.code ? null : s.code)}
              />
            ))}

            {/* Guide dots */}
            {visible.map(s => (
              <circle key={'g-' + s.code} cx={x(guide)} cy={y(s.values[guide])} r={3} fill={s.color}
                opacity={selected !== null && selected !== s.code ? 0.2 : 1} />
            ))}
          </svg>

          {/* Tooltip */}
          <div
            className="absolute top-2 pointer-events-none bg-[#0f172a] border border-white/10 rounded-md px-2.5 py-2 text-[11px] w-36"
            style={{ left: `calc(${(x(guide) / VW) * 100}% ${x(guide) > VW / 2 ? '- 152px' : '+ 10px'})` }}
          >
            <p className="text-slate-400 mb-1">{fmtDay(DATES[guide])}</p>
            {tipRows.map(r => (
              <p key={r.code} className="flex items-center justify-between gap-2 text-slate-200">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="truncate">{r.code}</span>
                </span>
                <span className="tabular-nums">{r.v.toFixed(1)}%</span>
              </p>
            ))}
          </div>
        </div>

        {/* Date scrubber */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-slate-500 w-24">{fmtDay(DATES[scrub])}</span>
          <input
            type="range" min={0} max={n - 1} step={1} value={scrub}
            onChange={e => setScrub(+e.target.value)}
            className="flex-1"
          />
        </div>
        <p className="text-[11px] text-slate-600 mt-2">Toggle a country in the legend · click a line to inspect it · drag the slider or hover to read values.</p>
      </div>

      {/* Country panel */}
      <aside className="w-full lg:w-72 lg:flex-shrink-0 bg-[#0f172a] border border-white/10 rounded-xl p-5">
        {sel && stats ? (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Selected</p>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sel.color }} />
              {sel.name}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Stat label="Current" value={`${stats.cur.toFixed(1)}%`} />
              <Stat label="Peak" value={`${stats.peak.toFixed(1)}%`} sub={fmtDate(stats.peakDate)} />
              <Stat label="Start" value={`${stats.start.toFixed(1)}%`} />
              <Stat label="Change" value={`${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(1)} pts`} />
            </div>
            {!stats.isAvg && (
              <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                <p className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Rank (current)</span>
                  <span>#{stats.rank} of {stats.total}</span>
                </p>
                <p className="flex justify-between text-slate-300">
                  <span className="text-slate-500">vs. average</span>
                  <span className={stats.vsAvg >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {stats.vsAvg >= 0 ? '+' : ''}{stats.vsAvg.toFixed(1)} pts
                  </span>
                </p>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="mt-5 text-xs text-slate-500 hover:text-white transition-colors">
              Clear selection
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm font-medium text-slate-300">No country selected</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Click a line in the chart to see its stats and rank.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.04] rounded-md px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-white leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}
