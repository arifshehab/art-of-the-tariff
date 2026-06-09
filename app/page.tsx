'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Tariff, TariffData, TariffRateTier } from '@/types/tariff';
import CountryPanel from '@/components/CountryPanel';
import Legend from '@/components/Legend';

const TariffMap = dynamic(() => import('@/components/TariffMap'), { ssr: false });

export default function Home() {
  const [tariffData, setTariffData] = useState<TariffData | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [activeFilter, setActiveFilter] = useState<TariffRateTier | 'all'>('all');
  const mapSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/tariffs')
      .then(r => r.json())
      .then(setTariffData);
  }, []);

  const counts = tariffData
    ? tariffData.tariffs.reduce((acc, t) => {
        acc[t.tariff_rate] = (acc[t.tariff_rate] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const lastUpdated = tariffData
    ? new Date(tariffData.last_updated).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : null;

  const scrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] overflow-x-hidden" style={{ fontFamily: "'Cera Pro', 'Trebuchet MS', sans-serif" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white font-semibold text-sm tracking-tight">US Tariff Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-slate-500 hidden sm:block">Updated {lastUpdated}</span>
          )}
          <a
            href={tariffData?.source_url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-white transition-colors border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5"
          >
            Source ↗
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-16">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-5 max-w-3xl">
          Art of the Tariff
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl leading-relaxed max-w-xl mb-10">
          Real-time tracking of U.S. tariff actions and rates, by country.
        </p>
        <button
          onClick={scrollToMap}
          className="inline-flex items-center gap-2 bg-white text-[#0a0f1e] font-semibold text-sm px-6 py-3 rounded-full hover:bg-slate-100 transition-colors"
        >
          Explore
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* Map section */}
      <section
        ref={mapSectionRef}
        className="relative mb-10 rounded-2xl overflow-hidden border border-white/10"
        style={{ height: '100vh', width: '75vw', marginLeft: 'auto', marginRight: 'auto' }}
      >
        {tariffData && (
          <TariffMap
            tariffs={tariffData.tariffs}
            onCountrySelect={setSelectedTariff}
            selectedCountry={selectedTariff?.country_code ?? null}
            activeFilter={activeFilter}
          />
        )}

        {!tariffData && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]">
            <div className="text-slate-500 text-sm animate-pulse">Loading map…</div>
          </div>
        )}

        <CountryPanel tariff={selectedTariff} onClose={() => setSelectedTariff(null)} />

        {tariffData && (
          <Legend activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
        )}

        {!selectedTariff && tariffData && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-xs text-slate-600 pointer-events-none whitespace-nowrap">
            Click a highlighted country to view tariff details
          </div>
        )}
      </section>

    </div>
  );
}
