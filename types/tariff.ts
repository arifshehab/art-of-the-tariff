export type TariffStatus = 'active' | 'upcoming' | 'expired';

export interface TariffType {
  name: string;
  sub_category?: string;
  rate: string;
  product_category: string;
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
