'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { SERIES, OVERALL, DATES } from '@/data/timeline';

const VW = 720, VH = 430;
const M = { top: 24, right: 56, bottom: 36, left: 44 };
const IW = VW - M.left - M.right;
const IH = VH - M.top - M.bottom;
const Y_START_TOP = 20;  // axis starts showing up to 20%
const Y_FLOOR_TOP = 40;  // after the early climb, never drops below 40%
const Y_MAX_TOP = 120;   // grows to at most 120% (China's spike)

export interface TimelineChartHandle {
  setProgress: (p: number) => void;
}

const TimelineChart = forwardRef<TimelineChartHandle>(function TimelineChart(_props, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const updateRef = useRef<(p: number) => void>(() => {});

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const n = DATES.length;
    const x = d3.scaleLinear().domain([0, n - 1]).range([M.left, M.left + IW]);
    const y = d3.scaleLinear().domain([0, Y_START_TOP]).range([M.top + IH, M.top]);

    const grid = svg.append('g');
    const yLabels = svg.append('g');

    // X labels at the first point of each calendar quarter.
    const fmt = d3.utcFormat('%b %Y');
    const quarterId = (s: string) => {
      const dt = new Date(s + 'T00:00:00Z');
      return dt.getUTCFullYear() * 4 + Math.floor(dt.getUTCMonth() / 3);
    };
    svg.append('g').selectAll('text').data(DATES).join('text')
      .attr('x', (_, i) => x(i)).attr('y', M.top + IH + 18).attr('text-anchor', 'middle')
      .attr('fill', '#64748b').attr('font-size', 10)
      .text((d, i) => {
        const isNewQuarter = i === 0 || quarterId(d) !== quarterId(DATES[i - 1]);
        return isNewQuarter ? fmt(new Date(d + 'T00:00:00Z')) : '';
      });

    // Reveal clip: x up to the playhead, y bounded to the plot area so anything
    // above the current top is truncated.
    const clipRect = svg.append('clipPath').attr('id', 'tl-clip')
      .append('rect').attr('x', 0).attr('y', M.top).attr('width', 0).attr('height', IH);

    const linesG = svg.append('g').attr('clip-path', 'url(#tl-clip)');
    const paths = SERIES.map(s =>
      linesG.append('path').attr('fill', 'none').attr('stroke', s.color)
        .attr('stroke-width', 2.5).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round'),
    );

    // Global average benchmark, drawn bold on top.
    const overallPath = linesG.append('path').attr('fill', 'none').attr('stroke', OVERALL.color)
      .attr('stroke-width', 3.5).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', '8 4');

    const dots = SERIES.map(s => svg.append('circle').attr('r', 3.5).attr('fill', s.color).attr('opacity', 0));
    const endLabels = SERIES.map(s =>
      svg.append('text').attr('fill', s.color).attr('font-size', 11).attr('font-weight', 500)
        .attr('opacity', 0).attr('dominant-baseline', 'middle').text(s.code),
    );
    const overallDot = svg.append('circle').attr('r', 4).attr('fill', OVERALL.color).attr('opacity', 0);
    const overallLabel = svg.append('text').attr('fill', OVERALL.color).attr('font-size', 11)
      .attr('font-weight', 600).attr('opacity', 0).attr('dominant-baseline', 'middle').text('AVG');
    const playhead = svg.append('line').attr('y1', M.top).attr('y2', M.top + IH)
      .attr('stroke', 'rgba(255,255,255,0.25)').attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3').attr('opacity', 0);

    updateRef.current = (p: number) => {
      const pp = Math.max(0, Math.min(1, p));
      const fpos = pp * (n - 1);
      const i0 = Math.floor(fpos), i1 = Math.min(i0 + 1, n - 1), f = fpos - i0;

      // Current value of each series at the playhead → drives the axis top.
      let curMax = 0;
      const interp = (vals: number[]) => vals[i0] + (vals[i1] - vals[i0]) * f;
      const cur = SERIES.map(s => {
        const v = interp(s.values);
        if (v > curMax) curMax = v;
        return v;
      });
      const curOverall = interp(OVERALL.values);
      // 20% floor only at the very start; once the climb begins it ratchets to 40%.
      const floor = pp < 0.12 ? Y_START_TOP : Y_FLOOR_TOP;
      const top = Math.max(floor, Math.min(Y_MAX_TOP, curMax * 1.18));
      y.domain([0, top]);

      // Gridlines + y labels for the current scale
      const ticks = y.ticks(5);
      grid.selectAll('line').data(ticks).join('line')
        .attr('x1', M.left).attr('x2', M.left + IW)
        .attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'rgba(255,255,255,0.08)');
      yLabels.selectAll('text').data(ticks).join('text')
        .attr('x', M.left - 6).attr('y', d => y(d) + 3).attr('text-anchor', 'end')
        .attr('fill', '#64748b').attr('font-size', 11).text(d => `${d}%`);

      // Redraw lines under the new scale
      const line = d3.line<number>().x((_, i) => x(i)).y(v => y(v)).curve(d3.curveMonotoneX);
      SERIES.forEach((s, k) => paths[k].attr('d', line(s.values) ?? ''));
      overallPath.attr('d', line(OVERALL.values) ?? '');

      // Reveal, playhead, leading dots + labels (clamped to the plot area)
      const fx = x(0) + pp * IW;
      clipRect.attr('width', fx);
      playhead.attr('x1', fx).attr('x2', fx).attr('opacity', pp > 0.001 ? 1 : 0);
      SERIES.forEach((s, k) => {
        const cy = Math.max(M.top, y(cur[k]));
        const onPlot = y(cur[k]) >= M.top;
        dots[k].attr('cx', fx).attr('cy', cy).attr('opacity', pp > 0.001 && onPlot ? 1 : 0);
        endLabels[k].attr('x', fx + 7).attr('y', cy).attr('opacity', pp > 0.06 && onPlot ? 1 : 0);
      });
      const oy = y(curOverall);
      overallDot.attr('cx', fx).attr('cy', oy).attr('opacity', pp > 0.001 ? 1 : 0);
      overallLabel.attr('x', fx + 7).attr('y', oy).attr('opacity', pp > 0.06 ? 1 : 0);
    };
    updateRef.current(0);
  }, []);

  useImperativeHandle(ref, () => ({ setProgress: (p: number) => updateRef.current(p) }), []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full h-auto"
      role="img"
      aria-label="Line chart of effective tariff rates for ten countries, 2025-2026, with a y-axis that grows as China's rate spikes and shrinks again."
    />
  );
});

export default TimelineChart;
