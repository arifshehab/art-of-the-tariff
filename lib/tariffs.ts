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
export const MAX_SCALE_RATE = 100;

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

/** authority code ("s232") → display group ("Section 232"). Anything else is "Others". */
export function groupOf(tt: TariffType): TariffGroup {
  switch (tt.authority) {
    case 's122': return 'Section 122';
    case 's232': return 'Section 232';
    case 's301': return 'Section 301';
    default: return 'Others';
  }
}

// Section 232 "X" + "X parts" raw codes collapse into one combined category.
const CATEGORY_ALIASES: Record<string, string> = {
  autos: 'autos_and_parts',
  auto_parts: 'autos_and_parts',
  mhd_vehicles: 'mhd_and_parts',
  mhd_parts: 'mhd_and_parts',
};

/** Merges related Section 232 raw codes ("autos"/"auto_parts") onto one canonical code. */
export function canonicalCategory(name: string): string {
  return CATEGORY_ALIASES[name] ?? name;
}

/**
 * The filter key for a tariff entry: its raw `name` code, canonicalized for
 * Section 232 (see canonicalCategory). Section 122 has one raw code
 * ("section_122"); Section 301's raw code is itself a distinct filter option
 * (each investigation theme, e.g. "forced_labour").
 */
export function categoryKey(tt: TariffType): string {
  return groupOf(tt) === 'Section 232' ? canonicalCategory(tt.name) : tt.name;
}

// Display label per group + raw/canonical code. Falls back to prettifying the
// code itself ("forced_labour" → "Forced Labour") for anything not listed —
// keeps this map from needing an entry for every future code.
const CODE_LABELS: Partial<Record<TariffGroup, Record<string, string>>> = {
  'Section 232': {
    steel: 'Steel',
    aluminum: 'Aluminum',
    autos_and_parts: 'Automobiles and parts',
    mhd_and_parts: 'Medium & heavy-duty vehicles and parts',
    buses: 'Buses',
    semiconductors: 'Semiconductors',
    softwood_lumber: 'Softwood lumber',
    wood_furniture: 'Wood furniture',
    kitchen_cabinets: 'Kitchen cabinets',
  },
  'Section 301': {
    china_301: 'Technology Transfer, Intellectual Property and Innovation',
    maritime_cargo_handling_equipment: 'Maritime',
    forced_labour: 'Forced Labour',
    excess_capacity: 'Excess Capacity',
    unreasonable_policies: 'Unreasonable Policies',
    pharmaceutical_pricing: 'Pharmaceutical Pricing',
    intellectual_property: 'Intellectual Property',
    labor_rights_human_rights_and_fundamental_freedoms_and_the_rule_of_law: 'Labor Rights',
  },
};

/** "forced_labour" → "Forced Labour" (fallback for any code not in CODE_LABELS). */
function prettify(code: string): string {
  return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Human label for a filter group + its raw/canonical code. */
export function tariffLabel(group: FilterGroup, key: string): string {
  if (group === 'Section 122') return 'All goods';
  return CODE_LABELS[group as TariffGroup]?.[key] ?? prettify(key);
}

// Shortened labels for the FilterBar's pinned pills, where space is tight.
// Only add an entry here for codes whose full label doesn't fit comfortably as
// a pill — anything unlisted just falls back to the full label (tariffLabel).
const SHORT_LABELS: Partial<Record<TariffGroup, Record<string, string>>> = {
  'Section 232': {
    aluminum: 'Alum',
    semiconductors: 'Semicon',
    mhd_and_parts: 'MHD Vehicles',
    autos_and_parts: 'Autos',
    softwood_lumber: 'Lumber',
    wood_furniture: 'Furniture',
    kitchen_cabinets: 'Cabinets',
  },
  'Section 301': {
    china_301: 'Tech Transfer',
    maritime_cargo_handling_equipment: 'Maritime',
    pharmaceutical_pricing: 'Pharma',
    intellectual_property: 'IP',
    labor_rights_human_rights_and_fundamental_freedoms_and_the_rule_of_law: 'Labor rights',
  },
};

/** Short label for a pinned pill; falls back to the full label (tariffLabel) when none is defined. */
export function tariffShortLabel(group: FilterGroup, key: string): string {
  return SHORT_LABELS[group as TariffGroup]?.[key] ?? tariffLabel(group, key);
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

/**
 * Collapse Section 232 "X" + "X parts" entries into a single combined category
 * (matching the filter). The combined rate is the higher of the two; if the two
 * rates differ, an asterisk is appended.
 */
export function mergeCategories(types: TariffType[]): TariffType[] {
  const s232 = new Map<string, TariffType[]>();
  const rest: TariffType[] = [];
  for (const t of types) {
    if (groupOf(t) === 'Section 232') {
      const key = canonicalCategory(t.name);
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
    merged.push({ ...top, name: key, rate });
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

/**
 * FilterBar's "pinned pill" queue. Lives here (rather than in FilterBar's own
 * state) so it's a single global value shared across every FilterBar instance
 * (map/list/imports each mount their own FilterBar) and survives view switches.
 */
export interface QueueItem {
  group: FilterGroup;
  key: string;
}

export const DEFAULT_FILTER_QUEUE: QueueItem[] = [
  { group: 'Section 301', key: 'forced_labour' },
  { group: 'Deal',        key: DEAL_KEY         },
  { group: 'Section 232', key: 'steel'          },
];

export const MAX_FILTER_QUEUE = 4;

// Authority number shown before the option label, e.g. "232 · Steel". Deal
// and Others have no statutory authority number, so they show unprefixed.
const AUTHORITY_PREFIX: Partial<Record<FilterGroup, string>> = {
  'Section 122': '122',
  'Section 232': '232',
  'Section 301': '301',
};

export function filterPillLabel(group: FilterGroup, rawLabel: string): string {
  const prefix = AUTHORITY_PREFIX[group];
  if (!prefix) return rawLabel;
  // "All goods" (Section 122's only category) adds nothing beyond the section
  // number itself — skip the "· All goods" suffix.
  if (rawLabel === 'All goods') return prefix;
  return `${prefix} · ${rawLabel}`;
}

/** Adds a newly-activated selection to the front of the pill queue (capped, no duplicates). */
export function pushFilterQueue(queue: QueueItem[], group: FilterGroup, key: string): QueueItem[] {
  if (queue.some(q => q.group === group && q.key === key)) return queue;
  return [{ group, key }, ...queue].slice(0, MAX_FILTER_QUEUE);
}

/** Does a tariff entry match the given filter selection? (Deal is not a tariff type.) */
export function matchesSelection(tt: TariffType, selection: TariffSelection): boolean {
  if (selection.group === 'Deal') return false;
  if (groupOf(tt) !== selection.group) return false;
  if (selection.group === 'Section 122' || selection.group === 'Others') return true;
  return categoryKey(tt) === selection.key;
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
  const key = group === 'Others' ? OTHERS_KEY : categoryKey(tt);
  return { group, key };
}

/** The selectable tariffs under each filter category. */
export function getFilterOptions(tariffs: Tariff[]): Record<FilterGroup, FilterOption[]> {
  const s122 = new Set<string>();
  const s232 = new Set<string>();
  const s301 = new Set<string>();
  let hasOthers = false;
  let hasDeals = false;
  for (const country of tariffs) {
    if (country.deals.length > 0) hasDeals = true;
    for (const tt of getVisibleTariffTypes(country)) {
      const g = groupOf(tt);
      if (g === 'Section 122') s122.add(categoryKey(tt));
      else if (g === 'Section 232') s232.add(categoryKey(tt));
      else if (g === 'Section 301') s301.add(categoryKey(tt));
      else if (g === 'Others') hasOthers = true;
    }
  }
  const withLabels = (group: TariffGroup, keys: Set<string>): FilterOption[] =>
    [...keys].sort().map(key => ({ key, label: tariffLabel(group, key) }));
  return {
    'Section 122': withLabels('Section 122', s122),
    'Section 232': withLabels('Section 232', s232),
    'Section 301': withLabels('Section 301', s301),
    'Others': hasOthers ? [{ key: OTHERS_KEY, label: 'All other tariffs' }] : [],
    'Deal': hasDeals ? [{ key: DEAL_KEY, label: 'All deals' }] : [],
  };
}

/** The tariff entry a country resolves to under the current selection (the highest-rate match), or null. */
export function tariffForSelection(country: Tariff, selection: TariffSelection): TariffType | null {
  if (selection.group === 'Deal') return null;
  return highestRate(getVisibleTariffTypes(country).filter(t => matchesSelection(t, selection))) ?? null;
}

/** The rate string for a country under the current selection, or null if none applies. */
export function rateForSelection(country: Tariff, selection: TariffSelection): string | null {
  return tariffForSelection(country, selection)?.rate ?? null;
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
