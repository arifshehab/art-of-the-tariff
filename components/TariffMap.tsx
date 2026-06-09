'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tariff, TariffRateTier } from '@/types/tariff';

interface TariffMapProps {
  tariffs: Tariff[];
  onCountrySelect: (tariff: Tariff | null) => void;
  selectedCountry: string | null;
  activeFilter: TariffRateTier | 'all';
}

const RATE_COLORS: Record<string, string> = {
  '10%':   '#6E9171',
  '12.5%': '#C54E24',
};

const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

function buildCountryCodes(tariffs: Tariff[]): Record<string, { color: string; tariff: Tariff }> {
  const map: Record<string, { color: string; tariff: Tariff }> = {};
  for (const t of tariffs) {
    const color = RATE_COLORS[t.tariff_rate] ?? '#64748b';
    if (t.country_code === 'EU') {
      for (const code of EU_COUNTRIES) {
        map[code] = { color, tariff: t };
      }
    } else {
      map[t.country_code] = { color, tariff: t };
    }
  }
  return map;
}

export default function TariffMap({ tariffs, onCountrySelect, selectedCountry, activeFilter }: TariffMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const filteredTariffs = activeFilter === 'all'
    ? tariffs
    : tariffs.filter(t => t.tariff_rate === activeFilter);

  const countryMap = buildCountryCodes(filteredTariffs);

  // Build match expression for fill color
  const buildColorExpression = useCallback(() => {
    const expr: (string | string[])[] = ['match', ['get', 'iso_3166_1']];
    for (const [code, { color }] of Object.entries(countryMap)) {
      expr.push(code, color);
    }
    expr.push('#1e293b'); // default
    return expr;
  }, [filteredTariffs]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [15, 20],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 6,
      projection: 'mercator',
      attributionControl: false,
      config: {
        basemap: { theme: 'monochrome', lightPreset: 'day' },
      },
    } as mapboxgl.MapOptions);

    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      // Country fill layer
      map.addLayer({
        id: 'country-fills',
        slot: 'middle',
        type: 'fill',
        source: { type: 'vector', url: 'mapbox://mapbox.country-boundaries-v1' },
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
        source: { type: 'vector', url: 'mapbox://mapbox.country-boundaries-v1' },
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': '#0f172a',
          'line-width': 0.5,
        },
      });

      // Hover highlight layer
      map.addLayer({
        id: 'country-hover',
        slot: 'top',
        type: 'fill',
        source: { type: 'vector', url: 'mapbox://mapbox.country-boundaries-v1' },
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

      setMapLoaded(true);
    });

    // Hover state
    let hoveredId: string | number | null = null;
    map.on('mousemove', 'country-fills', (e) => {
      if (!e.features?.length) return;
      const code = e.features[0].properties?.iso_3166_1;
      if (countryMap[code]) {
        map.getCanvas().style.cursor = 'pointer';
      } else {
        map.getCanvas().style.cursor = '';
      }
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'country-fills', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
      }
      hoveredId = e.features[0].id ?? null;
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'country-fills', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: true });
      }
    });

    map.on('mouseleave', 'country-fills', () => {
      map.getCanvas().style.cursor = '';
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'country-fills', sourceLayer: 'country_boundaries', id: hoveredId }, { hover: false });
      }
      hoveredId = null;
    });

    // Click
    map.on('click', 'country-fills', (e) => {
      const code = e.features?.[0]?.properties?.iso_3166_1;
      if (!code) return;
      const match = countryMap[code];
      if (match) {
        onCountrySelect(match.tariff);
      } else {
        onCountrySelect(null);
      }
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['country-fills'] });
      if (!features.length) onCountrySelect(null);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update fill colors when filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    map.setPaintProperty('country-fills', 'fill-color', buildColorExpression() as mapboxgl.Expression);
  }, [filteredTariffs, mapLoaded, buildColorExpression]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
    />
  );
}
