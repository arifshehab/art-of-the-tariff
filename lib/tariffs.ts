import { Tariff, TariffType } from '@/types/tariff';
import globalTariffData from '@/data/globaltariff.json';

export type TariffGroup = 'Section 122' | 'Section 232' | 'Section 301' | 'Others';

export const TARIFF_GROUPS: TariffGroup[] = ['Section 122', 'Section 232', 'Section 301', 'Others'];

export interface TariffSelection {
  group: TariffGroup;
  key: string;
}

/** Each scheme runs lightest → darkest; bins are 5 percentage points wide. */
export const COLOR_SCHEMES: Record<TariffGroup, string[]> = {
  'Section 122': ['#e9f5db', '#cfe1b9', '#b5c99a', '#97a97c', '#87986a', '#718355'],
  'Section 232': ["#e3f2fd","#bbdefb","#90caf9","#64b5f6","#42a5f5","#2196f3","#1e88e5","#1976d2","#1565c0","#0d47a1"],
  'Section 301': ['#dec9e9', '#dac3e8', '#d2b7e5', '#c19ee0', '#b185db', '#a06cd5', '#9163cb', '#815ac0', '#7251b5', '#6247aa'],
  'Others': ['#C54E24'],
};

export const GREY = '#ced4da';      // TBD rates and countries outside the selection
export const NO_DATA = '#ced4da';   // countries not in the dataset
const WHITE = '#ffffff';            // 0% rates

export function groupOf(tt: TariffType): TariffGroup {
  if (tt.name === 'Section 122' || tt.name === 'Section 232' || tt.name === 'Section 301') {
    return tt.name;
  }
  return 'Others';
}

/** "12.5%" → 12.5, "15%*" → 15 (asterisk ignored), "TBD"/empty → null. */
export function parseRate(rate: string): number | null {
  const n = parseFloat(rate.replace(/[%*\s]/g, ''));
  return isNaN(n) ? null : n;
}

/** 0% and TBD → white, otherwise 5pt bins into the group scheme (clamped to darkest). */
export function rateColor(group: TariffGroup, rate: string): string {
  const n = parseRate(rate);
  if (n === null) return WHITE;
  if (n === 0) return WHITE;
  const scheme = COLOR_SCHEMES[group];
  const idx = Math.min(Math.ceil(n / 5) - 1, scheme.length - 1);
  return scheme[idx];
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

export interface FilterOption {
  key: string;
  label: string;
}

/** The selectable tariffs under each filter category, stale rule applied. */
export function getFilterOptions(tariffs: Tariff[]): Record<TariffGroup, FilterOption[]> {
  const s301 = new Set<string>();
  const others = new Set<string>();
  for (const country of tariffs) {
    for (const tt of getVisibleTariffTypes(country)) {
      if (tt.name === 'Section 301') s301.add(s301Key(tt));
      else if (groupOf(tt) === 'Others') others.add(tt.name);
    }
  }
  return {
    'Section 122': [{ key: 'All goods', label: 'All goods' }],
    'Section 232': getGlobalS232()
      .map(g => ({ key: g.product_category, label: g.product_category }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    'Section 301': [...s301].sort().map(k => ({ key: k, label: k })),
    'Others': [...others].sort().map(k => ({ key: k, label: k })),
  };
}

/** Fill color per country code for the current selection (grey when no selection). */
export function getCountryColors(
  tariffs: Tariff[],
  selection: TariffSelection | null,
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const c of tariffs) colors[c.country_code] = GREY;
  if (!selection) return colors;

  if (selection.group === 'Section 232') {
    const global = getGlobalS232().find(g => g.product_category === selection.key);
    const baseColor = global ? rateColor('Section 232', global.rate) : GREY;
    for (const c of tariffs) {
      const own = getVisibleTariffTypes(c).find(
        t => t.name === 'Section 232' && t.product_category === selection.key,
      );
      colors[c.country_code] = own ? rateColor('Section 232', own.rate) : baseColor;
    }
    return colors;
  }

  for (const c of tariffs) {
    const match = getVisibleTariffTypes(c).find(t => {
      if (selection.group === 'Section 122') return t.name === 'Section 122';
      if (selection.group === 'Section 301') return t.name === 'Section 301' && s301Key(t) === selection.key;
      return groupOf(t) === 'Others' && t.name === selection.key;
    });
    if (match) colors[c.country_code] = rateColor(selection.group, match.rate);
  }
  return colors;
}
