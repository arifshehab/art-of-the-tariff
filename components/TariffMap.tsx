'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Tariff } from '@/types/tariff';
import { NO_DATA } from '@/lib/tariffs';

interface TariffMapProps {
  tariffs: Tariff[];
  countryColors: Record<string, string>;
  onCountrySelect: (tariff: Tariff | null) => void;
  selectedCountry: string | null;
}

export default function TariffMap({ tariffs, countryColors, onCountrySelect, selectedCountry }: TariffMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const countryByCode: Record<string, Tariff> = {};
  for (const t of tariffs) countryByCode[t.country_code] = t;

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
      map.getCanvas().style.cursor = countryByCode[code] ? 'pointer' : '';
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
      onCountrySelect(countryByCode[code] ?? null);
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['country-fills'] });
      if (!features.length) onCountrySelect(null);
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

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
    />
  );
}
