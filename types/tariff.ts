export type TariffStatus = 'confirmed' | 'paused' | 'threatened';
export type TariffRateTier = '10%' | '12.5%' | 'other';

export interface Tariff {
  country: string;
  country_code: string;
  tariff_rate: string;
  product_category: string;
  status: TariffStatus;
  effective_date: string;
  citation_url: string;
}

export interface TariffData {
  last_updated: string;
  source_url: string;
  tariffs: Tariff[];
}
