'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Tariff, TariffData } from '@/types/tariff';
import { TariffSelection, getCountryColors, getFilterOptions, statusForSelection } from '@/lib/tariffs';
import CountryPanel from '@/components/CountryPanel';
import Legend from '@/components/Legend';
import Header from '@/components/Header';

const TariffMap = dynamic(() => import('@/components/TariffMap'), { ssr: false });
const TradeTreemap = dynamic(() => import('@/components/TradeTreemap'), { ssr: false });

type ViewMode = 'map' | 'trade';

export default function Home() {
  const [tariffData, setTariffData] = useState<TariffData | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selection, setSelection] = useState<TariffSelection | null>(null);
  const [view, setView] = useState<ViewMode>('map');
  const mapSectionRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/tariffs')
      .then(r => r.json())
      .then(setTariffData);
  }, []);

  const selectedTariff = useMemo(
    () => tariffData?.tariffs.find(t => t.country_code === selectedCountryCode) ?? null,
    [tariffData, selectedCountryCode],
  );

  const countryColors = useMemo(
    () => getCountryColors(tariffData?.tariffs ?? [], selection),
    [tariffData, selection],
  );

  const filterOptions = useMemo(
    () => getFilterOptions(tariffData?.tariffs ?? []),
    [tariffData],
  );

  const scaleStatus = useMemo(
    () => statusForSelection(tariffData?.tariffs ?? [], selection),
    [tariffData, selection],
  );

  const scrollToMap = () => {
    toggleRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCountrySelect = (tariff: Tariff | null) =>
    setSelectedCountryCode(tariff?.country_code ?? null);

  return (
    <div className="min-h-screen bg-[#0a0f1e] overflow-x-hidden" style={{ fontFamily: "'Cera Pro', 'Trebuchet MS', sans-serif" }}>

      <Header />

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

      {/* View toggle (above the visualisation) */}
      {tariffData && (
        <div ref={toggleRef} className="mx-auto w-[92vw] md:w-[75vw] mb-0 flex">
          <div className="flex w-full md:w-auto bg-[#0f172a] border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('map')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-medium transition-colors ${
                view === 'map' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              World map
            </button>
            <button
              onClick={() => setView('trade')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-medium transition-colors ${
                view === 'trade' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              By import volume
            </button>
          </div>
        </div>
      )}

      {/* Map section: docked rail on desktop, stacked below the map on mobile */}
      <section
        ref={mapSectionRef}
        className="relative mb-10 mx-auto rounded-2xl overflow-hidden border border-white/10 flex flex-col md:flex-row w-[92vw] md:w-[75vw] h-[90vh]"
      >
        {/* Map area */}
        <div className="relative w-full h-[45vh] md:h-full md:flex-1 min-w-0">
          {tariffData && view === 'map' && (
            <TariffMap
              tariffs={tariffData.tariffs}
              countryColors={countryColors}
              selection={selection}
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountryCode}
            />
          )}

          {tariffData && view === 'trade' && (
            <TradeTreemap
              tariffs={tariffData.tariffs}
              countryColors={countryColors}
              selection={selection}
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountryCode}
            />
          )}

          {!tariffData && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]">
              <div className="text-slate-500 text-sm animate-pulse">Loading map…</div>
            </div>
          )}

        </div>

        {/* Rail: docked right on desktop, stacked below the map on mobile.
            Mobile scrolls as one column (filter below the panel); desktop pins the
            filter at the bottom with the panel scrolling internally. */}
        <div className="w-full md:w-80 flex-1 md:flex-none min-h-0 md:h-full bg-[#0f172a] border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-y-auto md:overflow-hidden">
          <CountryPanel
            tariff={selectedTariff}
            selection={selection}
            onClose={() => setSelectedCountryCode(null)}
            onSelectFilter={setSelection}
          />
          {tariffData && (
            <Legend
              options={filterOptions}
              selection={selection}
              scaleStatus={scaleStatus}
              onSelect={setSelection}
            />
          )}
        </div>
      </section>

    </div>
  );
}
