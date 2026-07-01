'use client';

import { STATUS_SCALES, MAX_SCALE_RATE, PURPLE, rateColor } from '@/lib/tariffs';

interface LegendProps {
  scaleStatus: string;
  hasNumeric: boolean;
  hasTBD: boolean;
  isDeal: boolean;
  className?: string;
}

function DealKey() {
  return (
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rateColor('active', '20%') }} />
        Active
      </span>
      <span className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rateColor('upcoming', '20%') }} />
        Pending
      </span>
    </div>
  );
}

export default function Legend({ scaleStatus, hasNumeric, hasTBD, isDeal, className }: LegendProps) {
  if (!hasNumeric && !hasTBD && !isDeal) return null;

  // Only the dark endpoint is used: a plain white → dark gradient is a true linear
  // ramp from 0% to 100%+. This is a display-only simplification of the key — it
  // does not reflect how the map/list actually shade rates (see rateColor in
  // lib/tariffs.ts), which stays a discrete, non-linear scale intentionally.
  const [, dark] = STATUS_SCALES[scaleStatus] ?? STATUS_SCALES.active;
  const label = scaleStatus.charAt(0).toUpperCase() + scaleStatus.slice(1);

  return (
    <div className={className ?? 'flex-shrink-0 border-t border-white/10 px-4 py-3'}>
      {isDeal ? (
        <DealKey />
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {hasNumeric && (
            <>
              <span className="text-[10px] text-slate-500">{label} rate</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600">0%</span>
                <span
                  className="block w-24 h-2 rounded-sm"
                  style={{ background: `linear-gradient(to right, #ffffff, ${dark})` }}
                />
                <span className="text-[10px] text-slate-600">{MAX_SCALE_RATE}%+</span>
              </div>
            </>
          )}
          {hasTBD && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PURPLE }} />
              TBD
            </div>
          )}
        </div>
      )}
    </div>
  );
}
