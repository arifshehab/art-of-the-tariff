'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tariff } from '@/types/tariff';
import { NO_DATA, TariffSelection, rateForSelection } from '@/lib/tariffs';

// Inhabited-world extent (drops Antarctica and the empty far north). The initial
// view "covers" this — it fills the viewport without showing anything beyond it.
const WORLD_W = -168, WORLD_E = 179, WORLD_S = -55, WORLD_N = 72;

function coverCamera(width: number, height: number): { center: [number, number]; zoom: number } | null {
  if (!width || !height) return null;
  const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const lngSpan = WORLD_E - WORLD_W;
  const mercSpan = mercY(WORLD_N) - mercY(WORLD_S);
  const zLng = Math.log2(width / ((lngSpan / 360) * 512));
  const zLat = Math.log2(height / ((mercSpan / (2 * Math.PI)) * 512));
  const midMerc = (mercY(WORLD_N) + mercY(WORLD_S)) / 2;
  const lat = (2 * Math.atan(Math.exp(midMerc)) - Math.PI / 2) * (180 / Math.PI);
  return { center: [(WORLD_W + WORLD_E) / 2, lat], zoom: Math.max(zLng, zLat) };
}

interface TariffMapProps {
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

export default function TariffMap({ tariffs, countryColors, selection, onCountrySelect, selectedCountry }: TariffMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<HoverTooltip | null>(null);

  const countryByCode: Record<string, Tariff> = {};
  for (const t of tariffs) countryByCode[t.country_code] = t;

  // Latest selection for use inside the (once-bound) map event handlers.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Feature id of the currently-selected country (for the feature-state border).
  const selectedIdRef = useRef<string | number | null>(null);

  const buildColorExpression = useCallback(() => {
    const expr: (string | string[])[] = ['match', ['get', 'iso_3166_1']];
    for (const [code, color] of Object.entries(countryColors)) {
      expr.push(code, color);
    }
    expr.push(NO_DATA);
    return expr;
  }, [countryColors]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [15, 20],
      zoom: 1,
      maxZoom: 6,
      projection: 'mercator',
      attributionControl: false,
      config: {
        basemap: { theme: 'monochrome', lightPreset: 'day' },
      },
    } as mapboxgl.MapOptions);

    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    // Initial view: cover the inhabited world (fills the viewport, crops the
    // overflow axis so no empty poles show). Min zoom locks to this; panning
    // afterwards is unrestricted.
    const fitWorld = (jump: boolean) => {
      const c = map.getContainer();
      const cam = coverCamera(c.clientWidth, c.clientHeight);
      if (!cam) return;
      map.setMinZoom(cam.zoom);
      if (jump) map.jumpTo(cam);
    };
    fitWorld(true);
    map.on('resize', () => fitWorld(false));

    map.on('load', () => {
      // Single shared vector source for every country layer.
      map.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
      });

      // Country fill layer
      map.addLayer({
        id: 'country-fills',
        slot: 'middle',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        filter: ['==', ['get', 'disputed'], 'false'],
        paint: {
          'fill-color': buildColorExpression() as mapboxgl.Expression,
          'fill-opacity': 1,
        },
      });

      // Country border layer
      map.addLayer({
        id: 'country-borders',
        slot: 'middle',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': '#000',
          'line-width': 0.5,
        },
      });

      // Hover highlight layer
      map.addLayer({
        id: 'country-hover',
        slot: 'top',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.15,
            0,
          ],
        },
      });

      // Hover border highlight
      map.addLayer({
        id: 'country-hover-border',
        slot: 'top',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': '#0a0f1e',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1.5,
            0,
          ],
        },
      });

      // Selected-country border highlight (driven by feature-state for speed)
      map.addLayer({
        id: 'country-selected-border',
        slot: 'top',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': '#0a0f1e',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2,
            0,
          ],
        },
      });

      setMapLoaded(true);
    });

    // Hover state
    let hoveredId: string | number | null = null;
    let lastCursor = '';
    const clearHover = () => {
      if (lastCursor !== '') {
        map.getCanvas().style.cursor = '';
        lastCursor = '';
      }
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
        hoveredId = null;
      }
      setTooltip(null);
    };

    map.on('mousemove', 'country-fills', (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties ?? {};
      const code = props.iso_3166_1;
      if (code === 'US') { clearHover(); return; } // the US itself is not interactive

      const country = countryByCode[code];
      const cursor = country ? 'pointer' : '';
      if (cursor !== lastCursor) {
        map.getCanvas().style.cursor = cursor;
        lastCursor = cursor;
      }

      // Tooltip: country name + rate (when a tariff is selected).
      const sel = selectionRef.current;
      setTooltip({
        name: country?.country ?? props.name_en ?? code,
        rate: country && sel ? rateForSelection(country, sel) : null,
        x: e.point.x,
        y: e.point.y,
      });

      const id = e.features[0].id ?? null;
      if (id === hoveredId) return;
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
      }
      hoveredId = id;
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: true });
      }
    });

    map.on('mouseleave', 'country-fills', clearHover);

    // Selected-country border via feature-state (instant; no tile re-filter).
    const applySelected = (id: string | number | null) => {
      if (selectedIdRef.current !== null && selectedIdRef.current !== id) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: selectedIdRef.current }, { selected: false });
      }
      selectedIdRef.current = id;
      if (id !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id }, { selected: true });
      }
    };
    const clearSelected = () => {
      if (selectedIdRef.current !== null) {
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: selectedIdRef.current }, { selected: false });
        selectedIdRef.current = null;
      }
    };

    // Click
    map.on('click', 'country-fills', (e) => {
      const f = e.features?.[0];
      const code = f?.properties?.iso_3166_1;
      const country = code ? countryByCode[code] : undefined;
      if (!country) { clearSelected(); onCountrySelect(null); return; }
      applySelected(f?.id ?? null);
      onCountrySelect(country);
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['country-fills'] });
      if (!features.length) { clearSelected(); onCountrySelect(null); }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update fill colors when the selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    map.setPaintProperty('country-fills', 'fill-color', buildColorExpression() as mapboxgl.Expression);
  }, [countryColors, mapLoaded, buildColorExpression]);

  // Clear the selected-border feature-state when the selection is cleared
  // externally (e.g. closing the panel). Selecting is handled in the click handler.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || selectedCountry !== null) return;
    if (selectedIdRef.current !== null) {
      map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: selectedIdRef.current }, { selected: false });
      selectedIdRef.current = null;
    }
  }, [selectedCountry, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      {tooltip && (() => {
        const ch = mapContainerRef.current?.clientHeight ?? 0;
        const flip = ch > 0 && tooltip.y > ch - 70;
        return (
        <div
          className="absolute z-20 pointer-events-none bg-[#0f172a] border border-white/10 rounded-md px-2.5 py-1.5"
          style={{
            left: tooltip.x + 12,
            top: flip ? tooltip.y - 12 : tooltip.y + 12,
            transform: flip ? 'translateY(-100%)' : undefined,
          }}
        >
          <p className="text-xs font-medium text-white whitespace-nowrap">{tooltip.name}</p>
          {tooltip.rate && (
            <p className="text-[11px] text-slate-400 whitespace-nowrap">{tooltip.rate}</p>
          )}
        </div>
        );
      })()}
    </div>
  );
}
