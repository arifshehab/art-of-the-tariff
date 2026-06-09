'use client';

import { Tariff, TariffStatus } from '@/types/tariff';
import { ExternalLink, X } from 'lucide-react';

interface CountryPanelProps {
  tariff: Tariff | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<TariffStatus, { label: string; className: string }> = {
  confirmed:  { label: 'Confirmed',  className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  paused:     { label: 'Paused',     className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  threatened: { label: 'Threatened', className: 'bg-violet-500/20 text-violet-400 border border-violet-500/30' },
};

export default function CountryPanel({ tariff, onClose }: CountryPanelProps) {
  const isVisible = tariff !== null;

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
          <div className="p-5 space-y-4">
            {/* Tariff Rate */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Tariff Rate</p>
              <p className="text-4xl font-bold text-white">{tariff.tariff_rate}</p>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[tariff.status].className}`}>
                {STATUS_CONFIG[tariff.status].label}
              </span>
            </div>

            {/* Product Category */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Applies To</p>
              <p className="text-sm text-slate-300">{tariff.product_category}</p>
            </div>

            {/* Effective Date */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Effective Date</p>
              <p className="text-sm text-slate-300">{tariff.effective_date === 'TBD' ? 'To be determined' : tariff.effective_date}</p>
            </div>

            {/* Citation */}
            <a
              href={tariff.citation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors pt-2 border-t border-white/10"
            >
              <ExternalLink size={12} />
              View source
            </a>
          </div>
        </>
      )}
    </div>
  );
}
