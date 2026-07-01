export type TariffStatus = 'active' | 'upcoming' | 'expired';

// Mirrors the raw source shape (statutory_tariffs_*.json / upcoming_301_tariffs.json):
// { authority, name, rate, status, effective_date, citation_url, comment? }.
// `authority` is the section code ("s122" | "s232" | "s301"); `name` is the
// product/theme code within that authority (e.g. "steel", "forced_labour").
// Display labels and grouping are derived from these two fields on demand
// (see groupOf / categoryKey / tariffLabel in lib/tariffs.ts) rather than
// stored as separate product_category/sub_category fields.
export interface TariffType {
  authority: string;
  name: string;
  rate: string;
  status: TariffStatus;
  effective_date: string;
  citation_url: string;
  comment?: string;
}

export type DealStatus = 'active' | 'pending';

export interface Deal {
  name: string;
  announcement_date: string;
  citation_url: string;
  status: DealStatus;
}

export interface Tariff {
  country: string;
  country_code: string;
  tariff_types: TariffType[];
  deals: Deal[];
}

export interface TariffData {
  last_updated: string;
  source_url: string;
  tariffs: Tariff[];
}
