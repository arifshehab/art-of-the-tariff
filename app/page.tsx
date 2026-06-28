'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Tariff, TariffData } from '@/types/tariff';
import { TariffSelection, getCountryColors, getFilterOptions, statusForSelection, selectionRateKinds } from '@/lib/tariffs';
import CountryPanel from '@/components/CountryPanel';
import CountrySearch from '@/components/CountrySearch';
import TreemapSizing, { SIZING_TOTAL } from '@/components/TreemapSizing';
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
  const [sizingSector, setSizingSector] = useState<string>(SIZING_TOTAL);
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

  const rateKinds = useMemo(
    () => selectionRateKinds(tariffData?.tariffs ?? [], selection),
    [tariffData, selection],
  );

  const scrollToMap = () => {
    toggleRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCountrySelect = (tariff: Tariff | null) =>
    setSelectedCountryCode(tariff?.country_code ?? null);

  return (
    <div className="min-h-screen bg-[#0a0f1e] overflow-x-hidden">
      <Header />

      {/* First visual section: hero + map. A glow sits at the base of the map and
          is clipped by this container, giving a clean cut to the dark section below.
          The pb-24 adds buffer space so the cut falls below the map, not at its edge. */}
      <div className="relative pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[700px]"
          style={{
            background:
              'radial-gradient(80% 95% at 50% 100%, rgba(56,89,168,0.50) 0%, rgba(31,52,110,0.20) 45%, rgba(10,15,30,0) 78%)',
          }}
        />

        <div className="relative z-10">

      {/* Hero */}
      <section className="flex flex-col items-start text-left mx-auto w-[92vw] md:w-[75vw] pt-24 pb-16">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.05] mb-6 max-w-3xl">
          Making sense of America&apos;s tariff chaos
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl leading-relaxed max-w-xl mb-10">
          Visualise every U.S. tariff action and the trade
          flows behind them, by country.
        </p>
        <button
          onClick={scrollToMap}
          className="inline-flex items-center gap-2 bg-white text-[#0a0f1e] font-semibold text-sm px-6 py-3 rounded-full hover:bg-slate-100 transition-colors"
        >
          Explore
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2v10M2 7l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </section>

      {/* View toggle (above the visualisation) */}
      {tariffData && (
        <div
          ref={toggleRef}
          className="relative z-30 mx-auto w-[92vw] md:w-[75vw] mb-0 flex flex-wrap items-center gap-y-2"
        >
          <div
            className={`flex w-full md:w-auto bg-[#0f172a] border border-white/10 overflow-hidden ${
              view === "trade"
                ? "rounded-l-lg md:rounded-r-none rounded-r-lg"
                : "rounded-lg"
            }`}
          >
            <button
              onClick={() => {
                setView("map");
                setSizingSector(SIZING_TOTAL);
              }}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-medium transition-colors ${
                view === "map"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              World map
            </button>
            <button
              onClick={() => setView("trade")}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-medium transition-colors ${
                view === "trade"
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              By import value
            </button>
          </div>
          {view === "trade" && (
            <TreemapSizing value={sizingSector} onChange={setSizingSector} />
          )}
        </div>
      )}

      {/* Map section: docked rail on desktop, stacked below the map on mobile */}
      <section
        ref={mapSectionRef}
        className="relative mb-10 mx-auto rounded-2xl overflow-hidden border border-white/10 flex flex-col md:flex-row w-[92vw] md:w-[75vw] h-[90vh]"
      >
        {/* Map area */}
        <div className="relative w-full h-[45vh] md:h-full md:flex-1 min-w-0">
          {tariffData && view === "map" && (
            <TariffMap
              tariffs={tariffData.tariffs}
              countryColors={countryColors}
              selection={selection}
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountryCode}
            />
          )}

          {tariffData && view === "trade" && (
            <TradeTreemap
              tariffs={tariffData.tariffs}
              countryColors={countryColors}
              selection={selection}
              onCountrySelect={handleCountrySelect}
              selectedCountry={selectedCountryCode}
              sector={sizingSector}
            />
          )}

          {!tariffData && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]">
              <div className="text-slate-500 text-sm animate-pulse">
                Loading map…
              </div>
            </div>
          )}
        </div>

        {/* Rail: docked right on desktop, stacked below the map on mobile.
            Mobile scrolls as one column (filter below the panel); desktop pins the
            filter at the bottom with the panel scrolling internally. */}
        <div className="w-full md:w-80 flex-1 md:flex-none min-h-0 md:h-full bg-[#0f172a] border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-y-auto md:overflow-hidden">
          {tariffData && (
            <CountrySearch
              tariffs={tariffData.tariffs}
              onSelect={handleCountrySelect}
            />
          )}
          <CountryPanel
            tariff={selectedTariff}
            selection={selection}
            sector={sizingSector}
            onClose={() => setSelectedCountryCode(null)}
            onSelectFilter={setSelection}
          />
          {tariffData && (
            <Legend
              options={filterOptions}
              selection={selection}
              scaleStatus={scaleStatus}
              hasNumeric={rateKinds.hasNumeric}
              hasTBD={rateKinds.hasTBD}
              onSelect={setSelection}
            />
          )}
        </div>
      </section>

        </div>
      </div>

      {/* Context copy below the map */}
      <section className="mx-auto w-[92vw] md:w-[75vw] pt-24 pb-24">
        <div className="space-y-5 text-slate-400 text-base sm:text-lg leading-relaxed">
          <p>
            Having dubbed himself the &ldquo;Tariff Man,&rdquo; Donald Trump took
            office with a stated goal of imposing broad-based tariffs on
            America&apos;s trading partners.
          </p>
          <p>
            And while he has remained steadfast in his support for tariffs, the implementation has been highly erratic. A churn of outlandish
            threats, legal challenges, and last-minute deals has peppered his administration's tariff regime. Since the first tariff announcements in early 2025, the US&apos;
            tariff rates have been revised more than forty times.
          </p>
          <p>
            Track and visualise every one of those changes, in one place.
          </p>
        </div>
      </section>

      {/* Feature columns */}
      <section className="mx-auto w-[92vw] md:w-[75vw] pb-32">
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureColumn
            title="Replay over time [upcoming feature]"
            description="Scroll through each revision since 2025 and watch rates shift, country by country."
            //href="/timeline"
            gradient="linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)"
          />
          <FeatureColumn
            title="Deep Dive by Country [upcoming feature]"
            description="Choose any trading partner to see its effective tariff rate and how it has been targeted over time, broken down by sector and tariff authority."
            gradient="linear-gradient(135deg, #155e75 0%, #0f172a 100%)"
          />
          <FeatureColumn
            title="Explore Scenarios [upcoming feature]"
            description="Adjust assumptions and visualise the impact of potential changes to the tariff regime."
            gradient="linear-gradient(135deg, #5b21b6 0%, #0f172a 100%)"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureColumn({
  title,
  description,
  href,
  gradient,
}: {
  title: string;
  description: string;
  href?: string;
  gradient: string;
}) {
  const content = (
    <>
      {/* Placeholder visual — swap in real imagery later */}
      <div
        className="aspect-[4/3] w-full rounded-xl border border-white/10"
        style={{ background: gradient }}
      />
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
