import { Tariff, TariffData, TariffType, TariffStatus, Deal } from '@/types/tariff';

/**
 * Adapter from the statutory source files (statutory_tariffs_*.json,
 * upcoming_301_tariffs.json) to the Tariff/TariffType shape the rest of the app
 * consumes. The sources use authority codes, product codes, decimal rates and a
 * flat status vocabulary; this maps each of those onto the legacy shape so
 * lib/tariffs.ts and the components need no changes.
 *
 * normalize() accepts multiple sources and merges them by country code: a
 * country's tariff_types/deals are concatenated across sources (the first
 * source to mention a country defines its display name).
 */

// authority code → display group name (must match groupOf() in lib/tariffs.ts).
const AUTHORITY_LABELS: Record<string, string> = {
  s122: 'Section 122',
  s232: 'Section 232',
  s301: 'Section 301',
};

// product code → display category. Auto/MHD labels intentionally match
// CATEGORY_ALIASES so mergeCategories() collapses them the same as before.
const PRODUCT_LABELS: Record<string, string> = {
  steel: 'Steel',
  aluminum: 'Aluminum',
  autos: 'Automobiles',
  auto_parts: 'Automobile parts',
  mhd_vehicles: 'Medium- and heavy-duty vehicles',
  mhd_parts: 'Medium- and heavy-duty vehicle parts',
  buses: 'Buses',
  semiconductors: 'Semiconductors',
  softwood_lumber: 'Softwood lumber',
  wood_furniture: 'Wood furniture',
  kitchen_cabinets: 'Kitchen cabinets',
  section_122: 'All goods',
};

// Section 301 product code → sub-category label. For S301 the sub-category is
// the distinguishing key (filter option + panel heading), so each investigation
// theme gets its own short label.
const S301_SUBCATEGORIES: Record<string, string> = {
  china_301: 'Technology Transfer, Intellectual Property and Innovation',
  maritime_cargo_handling_equipment: 'Maritime',
  forced_labour: 'Forced Labour',
  excess_capacity: 'Excess Capacity',
  unreasonable_policies: 'Unreasonable Policies',
  pharmaceutical_pricing: 'Pharmaceutical Pricing',
  intellectual_property: 'Intellectual Property',
  labor_rights_human_rights_and_fundamental_freedoms_and_the_rule_of_law: 'Labor Rights',
};

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

/** Fallback label for an unknown product code: "forced_labour" → "Forced Labour". */
function prettify(code: string): string {
  return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function mapTariffType(t: RawTariffType): TariffType {
  const isS301 = t.authority === 's301';
  return {
    name: AUTHORITY_LABELS[t.authority] ?? t.authority,
    product_category: isS301 ? 'All goods' : (PRODUCT_LABELS[t.name] ?? t.name),
    sub_category: isS301 ? (S301_SUBCATEGORIES[t.name] ?? prettify(t.name)) : undefined,
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
