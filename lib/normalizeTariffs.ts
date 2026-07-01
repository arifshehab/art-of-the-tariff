import { Tariff, TariffData, TariffType, TariffStatus, Deal } from '@/types/tariff';

/**
 * Adapter from the statutory source files (statutory_tariffs_*.json,
 * upcoming_301_tariffs.json) to the Tariff/TariffType shape the rest of the app
 * consumes. The sources use authority codes, product codes, decimal rates and a
 * flat status vocabulary. This layer only reshapes rate/status formatting
 * (decimal → percent, source status vocabulary → TariffStatus) — it does not
 * derive display labels or grouping. Those are computed on demand from the raw
 * `authority`/`name` codes by lib/tariffs.ts (groupOf, categoryKey, tariffLabel),
 * so TariffType stays a direct mirror of the source record.
 *
 * normalize() accepts multiple sources and merges them by country code: a
 * country's tariff_types/deals are concatenated across sources (the first
 * source to mention a country defines its display name).
 */

interface RawTariffType {
  authority: string;
  name: string;
  rate: string;
  status: string;
  effective_date: string;
  citation_url: string;
  comment?: string;
}

interface RawDeal {
  country_name?: string;
  date?: string;
  deal_type?: string;
  status?: string;
  link?: string;
}

interface RawCountry {
  country: string;
  country_code: string;
  tariff_types: RawTariffType[];
  deals?: RawDeal[];
}

interface RawData {
  last_updated: string;
  source_url?: string;
  tariffs: RawCountry[];
}

/** Decimal-fraction rate ("0.25") → percent string ("25%"); "TBD"/non-numeric pass through. */
function toPercent(rate: string): string {
  const n = parseFloat(rate);
  if (isNaN(n)) return rate;
  return `${+(n * 100).toFixed(2)}%`;
}

function mapStatus(status: string): TariffStatus {
  if (status === 'upcoming') return 'upcoming';
  if (status === 'expired') return 'expired';
  return 'active';
}

function mapTariffType(t: RawTariffType): TariffType {
  return {
    authority: t.authority,
    name: t.name,
    rate: toPercent(t.rate),
    status: mapStatus(t.status),
    effective_date: t.effective_date,
    citation_url: t.citation_url,
    comment: t.comment,
  };
}

function mapDeal(d: RawDeal): Deal {
  return {
    name: d.deal_type ?? '',
    announcement_date: d.date ?? '',
    citation_url: d.link ?? '',
    status: d.status === 'pending' ? 'pending' : 'active',
  };
}

function mapCountry(c: RawCountry): Tariff {
  return {
    country: c.country,
    country_code: c.country_code,
    tariff_types: c.tariff_types.map(mapTariffType),
    deals: (c.deals ?? []).map(mapDeal),
  };
}

export function normalize(...raws: RawData[]): TariffData {
  const order: string[] = [];
  const byCode = new Map<string, Tariff>();
  let lastUpdated = '';
  let sourceUrl = '';

  for (const raw of raws) {
    if (raw.last_updated > lastUpdated) lastUpdated = raw.last_updated;
    if (!sourceUrl && raw.source_url) sourceUrl = raw.source_url;
    for (const c of raw.tariffs) {
      const mapped = mapCountry(c);
      const existing = byCode.get(c.country_code);
      if (existing) {
        existing.tariff_types.push(...mapped.tariff_types);
        existing.deals.push(...mapped.deals);
      } else {
        byCode.set(c.country_code, mapped);
        order.push(c.country_code);
      }
    }
  }

  return {
    last_updated: lastUpdated,
    source_url: sourceUrl,
    tariffs: order.map(code => byCode.get(code)!),
  };
}
