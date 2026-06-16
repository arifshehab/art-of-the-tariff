import { Tariff, TariffType } from '@/types/tariff';
import globalTariffData from '@/data/globaltariff.json';

export type TariffGroup = 'Section 122' | 'Section 232' | 'Section 301' | 'Others';

export const TARIFF_GROUPS: TariffGroup[] = ['Section 122', 'Section 232', 'Section 301', 'Others'];

// Filter categories include the tariff groups plus the non-tariff "Deal" view.
export type FilterGroup = TariffGroup | 'Deal';

export const FILTER_GROUPS: FilterGroup[] = ['Section 122', 'Section 232', 'Section 301', 'Others', 'Deal'];

export interface TariffSelection {
  group: FilterGroup;
  key: string;
}

/** Continuous color scale endpoints (lightest → darkest) per tariff status. */
export const STATUS_SCALES: Record<string, [string, string]> = {
  threatened:  ['#dec9e9', '#3C3489'],
  implemented: ['#e9f5db', '#27500A'],
  confirmed:   ['#e9f5db', '#27500A'],
  delayed:     ['#e3f2fd', '#0d47a1'],
};

/** Rates at or above this map to the darkest end of the scales. */
export const MAX_SCALE_RATE = 50;

export const GREY = '#c0c0c0';      // Countries outside the selection
export const NO_DATA = '#c0c0c0';   // countries not in the dataset
const WHITE = '#ffffff';            // 0% and TBD rates

function lerpColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) =>
    Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0'),
  ).join('');
}

export function groupOf(tt: TariffType): TariffGroup {
  if (tt.name === 'Section 122' || tt.name === 'Section 232' || tt.name === 'Section 301') {
    return tt.name;
  }
  return 'Others';
}

// Section 232 "X" + "X parts" categories are treated as a single category.
const CATEGORY_ALIASES: Record<string, string> = {
  'Automobiles': 'Automobiles and parts',
  'Automobile parts': 'Automobiles and parts',
  'Medium- and heavy-duty vehicles': 'Medium- and heavy-duty vehicles and parts',
  'Medium- and heavy-duty vehicle parts': 'Medium- and heavy-duty vehicles and parts',
};

export function canonicalCategory(product_category: string): string {
  return CATEGORY_ALIASES[product_category] ?? product_category;
}

/** Of several tariff entries, the one with the highest numeric rate (for combined categories). */
function highestRate(entries: TariffType[]): TariffType | undefined {
  return entries.reduce<TariffType | undefined>((best, t) => {
    if (!best) return t;
    return (parseRate(t.rate) ?? -1) > (parseRate(best.rate) ?? -1) ? t : best;
  }, undefined);
}

/** "12.5%" → 12.5, "15%*" → 15 (asterisk ignored), "TBD"/empty → null. */
export function parseRate(rate: string): number | null {
  const n = parseFloat(rate.replace(/[%*\s]/g, ''));
  return isNaN(n) ? null : n;
}

// Upper bound (inclusive) of each shade band — a value on a border falls in
// the lower band (e.g. 10 → band 0). Fine-grained through 10–25% where rates vary.
const RATE_BANDS = [10, 11, 12.5, 15, 17.5, 20, 25, 50, 100, Infinity];
const SHADE_COUNT = RATE_BANDS.length;

/** Discrete shades per status, evenly interpolated lightest → darkest. */
const STATUS_SHADES: Record<string, string[]> = Object.fromEntries(
  Object.entries(STATUS_SCALES).map(([status, [light, dark]]) => [
    status,
    Array.from({ length: SHADE_COUNT }, (_, i) => lerpColor(light, dark, i / (SHADE_COUNT - 1))),
  ]),
);

/**
 * 0% and TBD → white; otherwise a discrete shade chosen by RATE_BANDS,
 * concentrating variation in the 10–25% range.
 */
export function rateColor(status: string, rate: string): string {
  const n = parseRate(rate);
  if (n === null || n === 0) return WHITE;
  const shades = STATUS_SHADES[status];
  if (!shades) return GREY;
  const idx = RATE_BANDS.findIndex(b => n <= b);
  return shades[idx === -1 ? SHADE_COUNT - 1 : idx];
}

/**
 * A threatened tariff whose date is more than 6 months in the past is treated
 * as stale and hidden from the country panel. Tariffs without a parseable date
 * (e.g. TBD or empty) are never considered stale.
 */
export function isStaleThreatened(t: TariffType, now: Date = new Date()): boolean {
  if (t.status !== 'threatened') return false;
  const date = new Date(t.effective_date);
  if (isNaN(date.getTime())) return false;
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return date < sixMonthsAgo;
}

/** Tariff types shown in the panel: hides stale threatened tariffs. */
export function getVisibleTariffTypes(tariff: Tariff): TariffType[] {
  return tariff.tariff_types.filter(t => !isStaleThreatened(t));
}

/** Worldwide Section 232 product tariffs, stale-filtered. */
export function getGlobalS232(): TariffType[] {
  return (globalTariffData.tariff_types as TariffType[]).filter(t => !isStaleThreatened(t));
}

/**
 * Panel data for a country: its own tariffs plus the worldwide Section 232
 * product rates, except where the country has its own (exempted) rate
 * for that product.
 */
export function getMergedTariffTypes(tariff: Tariff): TariffType[] {
  const own = getVisibleTariffTypes(tariff);
  const ownS232Products = new Set(
    own.filter(t => t.name === 'Section 232').map(t => t.product_category),
  );
  const globals = getGlobalS232().filter(g => !ownS232Products.has(g.product_category));
  return [...own, ...globals];
}

/** Selection key for a Section 301 entry. */
function s301Key(tt: TariffType): string {
  return tt.sub_category ?? 'General';
}

/**
 * Collapse Section 232 "X" + "X parts" entries into a single combined category
 * (matching the filter). The combined rate is the higher of the two; if the two
 * rates differ, an asterisk is appended.
 */
export function mergeCategories(types: TariffType[]): TariffType[] {
  const s232 = new Map<string, TariffType[]>();
  const rest: TariffType[] = [];
  for (const t of types) {
    if (t.name === 'Section 232') {
      const key = canonicalCategory(t.product_category);
      const arr = s232.get(key) ?? [];
      arr.push(t);
      s232.set(key, arr);
    } else {
      rest.push(t);
    }
  }

  const merged: TariffType[] = [];
  for (const [key, group] of s232) {
    const top = highestRate(group)!;
    const distinctRates = new Set(group.map(g => parseRate(g.rate) ?? -1));
    let rate = top.rate;
    if (distinctRates.size > 1 && !rate.includes('*')) rate += '*';
    merged.push({ ...top, product_category: key, sub_category: undefined, rate });
  }

  return [...rest, ...merged];
}

export interface FilterOption {
  key: string;
  label: string;
}

/** Sentinel key meaning "any tariff in the Others group". */
export const OTHERS_KEY = '__all_others__';
/** Sentinel key for the Deal filter. */
export const DEAL_KEY = '__deal__';

/** Does a tariff entry match the given filter selection? (Deal is not a tariff type.) */
export function matchesSelection(tt: TariffType, selection: TariffSelection): boolean {
  if (selection.group === 'Deal') return false;
  if (groupOf(tt) !== selection.group) return false;
  switch (selection.group) {
    case 'Section 122': return true;
    case 'Section 232': return canonicalCategory(tt.product_category) === selection.key;
    case 'Section 301': return s301Key(tt) === selection.key;
    case 'Others': return true; // Others is a single combined filter
  }
}

/** A deal whose name mentions "framework" is purple; an "agreement" is green — both at the 20% shade. */
export function dealColor(deal: { name: string }): string {
  return /framework/i.test(deal.name)
    ? rateColor('threatened', '20%')   // purple
    : rateColor('implemented', '20%'); // green (agreements + anything else)
}

/** The filter selection that corresponds to a tariff entry (e.g. clicked in the panel). */
export function selectionFor(tt: TariffType): TariffSelection {
  const group = groupOf(tt);
  const key =
    group === 'Section 122' ? 'All goods'
    : group === 'Section 232' ? canonicalCategory(tt.product_category)
    : group === 'Section 301' ? s301Key(tt)
    : OTHERS_KEY;
  return { group, key };
}

/** The selectable tariffs under each filter category, stale rule applied. */
export function getFilterOptions(tariffs: Tariff[]): Record<FilterGroup, FilterOption[]> {
  const s301 = new Set<string>();
  let hasOthers = false;
  let hasDeals = false;
  for (const country of tariffs) {
    if (country.deals.length > 0) hasDeals = true;
    for (const tt of getVisibleTariffTypes(country)) {
      if (tt.name === 'Section 301') s301.add(s301Key(tt));
      else if (groupOf(tt) === 'Others') hasOthers = true;
    }
  }
  return {
    'Section 122': [{ key: 'All goods', label: 'All goods' }],
    'Section 232': (() => {
      const seen = new Set<string>();
      const out: FilterOption[] = [];
      for (const g of getGlobalS232()) {
        const key = canonicalCategory(g.product_category);
        if (!seen.has(key)) { seen.add(key); out.push({ key, label: key }); }
      }
      return out.sort((a, b) => a.label.localeCompare(b.label));
    })(),
    'Section 301': [...s301].sort().map(k => ({ key: k, label: k })),
    'Others': hasOthers ? [{ key: OTHERS_KEY, label: 'All other tariffs' }] : [],
    'Deal': hasDeals ? [{ key: DEAL_KEY, label: 'All deals' }] : [],
  };
}

/** The rate string for a country under the current selection, or null if none applies. */
export function rateForSelection(country: Tariff, selection: TariffSelection): string | null {
  if (selection.group === 'Deal') return null;
  const match = highestRate(getVisibleTariffTypes(country).filter(t => matchesSelection(t, selection)));
  if (match) return match.rate;
  if (selection.group === 'Section 232') {
    const gm = highestRate(getGlobalS232().filter(g => canonicalCategory(g.product_category) === selection.key));
    if (gm) return gm.rate;
  }
  return null;
}

/** Status of the tariff a selection refers to (drives the legend scale). Defaults to implemented. */
export function statusForSelection(tariffs: Tariff[], selection: TariffSelection | null): string {
  if (!selection) return 'implemented';
  if (selection.group === 'Section 232') {
    const gm = getGlobalS232().find(g => canonicalCategory(g.product_category) === selection.key);
    if (gm) return gm.status;
  }
  for (const c of tariffs) {
    const m = getVisibleTariffTypes(c).find(t => matchesSelection(t, selection));
    if (m) return m.status;
  }
  return 'implemented';
}

/** Fill color per country code for the current selection (grey when no selection). */
export function getCountryColors(
  tariffs: Tariff[],
  selection: TariffSelection | null,
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const c of tariffs) colors[c.country_code] = GREY;
  if (!selection) return colors;

  // Deal view: colour by deal type (agreement = green, framework = purple).
  if (selection.group === 'Deal') {
    for (const c of tariffs) {
      if (c.deals.length > 0) colors[c.country_code] = dealColor(c.deals[0]);
    }
    return colors;
  }

  // For Section 232, countries without their own (exempted) rate fall back to
  // the worldwide product rate.
  let baseColor: string | null = null;
  if (selection.group === 'Section 232') {
    const gm = highestRate(
      getGlobalS232().filter(g => canonicalCategory(g.product_category) === selection.key),
    );
    baseColor = gm ? rateColor(gm.status, gm.rate) : null;
  }

  for (const c of tariffs) {
    const match = highestRate(getVisibleTariffTypes(c).filter(t => matchesSelection(t, selection)));
    if (match) colors[c.country_code] = rateColor(match.status, match.rate);
    else if (baseColor) colors[c.country_code] = baseColor;
  }
  return colors;
}
