import { Tariff, TariffType } from '@/types/tariff';

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
  active:   ['#e9f5db', '#27500A'], // green
  upcoming: ['#e3f2fd', '#0d47a1'], // blue
  expired:  ['#fecaca', '#7f1d1d'], // red
};

/** Rates at or above this map to the darkest end of the scales. */
export const MAX_SCALE_RATE = 50;

export const GREY = '#c0c0c0';      // Countries outside the selection
export const NO_DATA = '#c0c0c0';   // countries not in the dataset
const WHITE = '#ffffff';            // 0% rates
export const PURPLE = '#9FA1FF';    // TBD / unspecified rates

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
  'Medium & heavy-duty vehicles': 'Medium & heavy-duty vehicles and parts',
  'Medium & heavy-duty vehicle parts': 'Medium & heavy-duty vehicles and parts',
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
const RATE_BANDS = [10, 11, 12.5, 15, 20, 25, 35, 50, 100, Infinity];
const SHADE_COUNT = RATE_BANDS.length;

/** Discrete shades per status, evenly interpolated lightest → darkest. */
const STATUS_SHADES: Record<string, string[]> = Object.fromEntries(
  Object.entries(STATUS_SCALES).map(([status, [light, dark]]) => [
    status,
    Array.from({ length: SHADE_COUNT }, (_, i) => lerpColor(light, dark, i / (SHADE_COUNT - 1))),
  ]),
);

/**
 * TBD / unspecified rate → purple; 0% → white; otherwise a discrete shade
 * chosen by RATE_BANDS, concentrating variation in the 10–25% range.
 */
export function rateColor(status: string, rate: string): string {
  const n = parseRate(rate);
  if (n === null) return PURPLE;
  if (n === 0) return WHITE;
  const shades = STATUS_SHADES[status];
  if (!shades) return GREY;
  const idx = RATE_BANDS.findIndex(b => n <= b);
  return shades[idx === -1 ? SHADE_COUNT - 1 : idx];
}

/** Tariff types shown in the panel. */
export function getVisibleTariffTypes(tariff: Tariff): TariffType[] {
  return tariff.tariff_types;
}

/** Panel data for a country: its own tariffs (single source of truth). */
export function getMergedTariffTypes(tariff: Tariff): TariffType[] {
  return getVisibleTariffTypes(tariff);
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
    case 'Others': return true;
  }
}

/** Deal colour by status: active = green, pending = blue (both at the 20% shade). */
export function dealColor(deal: { status: string }): string {
  return deal.status === 'pending'
    ? rateColor('upcoming', '20%')  // blue
    : rateColor('active', '20%');   // green
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

/** The selectable tariffs under each filter category. */
export function getFilterOptions(tariffs: Tariff[]): Record<FilterGroup, FilterOption[]> {
  const s232 = new Set<string>();
  const s301 = new Set<string>();
  let hasS122 = false;
  let hasOthers = false;
  let hasDeals = false;
  for (const country of tariffs) {
    if (country.deals.length > 0) hasDeals = true;
    for (const tt of getVisibleTariffTypes(country)) {
      const g = groupOf(tt);
      if (g === 'Section 122') hasS122 = true;
      else if (g === 'Section 232') s232.add(canonicalCategory(tt.product_category));
      else if (g === 'Section 301') s301.add(s301Key(tt));
      else if (g === 'Others') hasOthers = true;
    }
  }
  return {
    'Section 122': hasS122 ? [{ key: 'All goods', label: 'All goods' }] : [],
    'Section 232': [...s232].sort().map(k => ({ key: k, label: k })),
    'Section 301': [...s301].sort().map(k => ({ key: k, label: k })),
    'Others': hasOthers ? [{ key: OTHERS_KEY, label: 'All other tariffs' }] : [],
    'Deal': hasDeals ? [{ key: DEAL_KEY, label: 'All deals' }] : [],
  };
}

/** The rate string for a country under the current selection, or null if none applies. */
export function rateForSelection(country: Tariff, selection: TariffSelection): string | null {
  if (selection.group === 'Deal') return null;
  const match = highestRate(getVisibleTariffTypes(country).filter(t => matchesSelection(t, selection)));
  return match ? match.rate : null;
}

/** Status of the tariff a selection refers to (drives the legend scale). Defaults to active. */
export function statusForSelection(tariffs: Tariff[], selection: TariffSelection | null): string {
  if (!selection) return 'active';
  for (const c of tariffs) {
    const m = getVisibleTariffTypes(c).find(t => matchesSelection(t, selection));
    if (m) return m.status;
  }
  return 'active';
}

/**
 * Which kinds of rate the current selection actually paints on the map:
 * `hasNumeric` (a country resolves to a real rate → gradient applies) and
 * `hasTBD` (a country's matching rate is TBD/unspecified → purple key). Mirrors
 * getCountryColors so the legend matches what's shown.
 */
export function selectionRateKinds(
  tariffs: Tariff[],
  selection: TariffSelection | null,
): { hasNumeric: boolean; hasTBD: boolean } {
  let hasNumeric = false;
  let hasTBD = false;
  if (!selection || selection.group === 'Deal') return { hasNumeric, hasTBD };
  for (const c of tariffs) {
    const match = highestRate(getVisibleTariffTypes(c).filter(t => matchesSelection(t, selection)));
    if (!match) continue;
    const n = parseRate(match.rate);
    if (n === null) hasTBD = true;
    else hasNumeric = true;
  }
  return { hasNumeric, hasTBD };
}

/** Fill color per country code for the current selection (grey when no selection). */
export function getCountryColors(
  tariffs: Tariff[],
  selection: TariffSelection | null,
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const c of tariffs) colors[c.country_code] = GREY;
  if (!selection) return colors;

  // Deal view: colour by deal type (agreement = green, framework = blue).
  if (selection.group === 'Deal') {
    for (const c of tariffs) {
      if (c.deals.length > 0) colors[c.country_code] = dealColor(c.deals[0]);
    }
    return colors;
  }

  for (const c of tariffs) {
    const match = highestRate(getVisibleTariffTypes(c).filter(t => matchesSelection(t, selection)));
    if (match) colors[c.country_code] = rateColor(match.status, match.rate);
  }
  return colors;
}
