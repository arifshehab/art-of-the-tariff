// Rebuilds data/tariffs.json from the scraped trade-compliance tracker data.
// Country/code/EU-membership list is taken from the existing tariffs.json.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'tariffs.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const FL_CITE  = 'https://ustr.gov/sites/default/files/files/Press/Releases/2026/FRN%20-%20Forced%20Labor%20Import%20Ban%20301%20-%20FINAL.pdf';
const EC_CITE  = 'https://ustr.gov/sites/default/files/files/Press/Releases/2026/USTR%20301%20FRN%20Industrial%20Excess%20Capacity%203-11-26.pdf';
const DST_CITE = 'https://www.whitehouse.gov/presidential-actions/2025/02/defending-american-companies-and-innovators-from-overseas-extortion-and-unfair-fines-and-penalties/';

// Universal Section 122 baseline — applied to every country (implemented only).
const baseline = () => ({
  name: 'Section 122',
  rate: '10%',
  product_category: 'All goods',
  status: 'implemented',
  effective_date: '2026-02-24',
  citation_url: 'https://www.federalregister.gov/d/2026-03824',
});

const fl = (rate) => ({
  name: 'Section 301',
  sub_category: 'Forced Labour',
  rate,
  product_category: 'All goods',
  status: 'threatened',
  // Row lists two dates "(Mar. 12, 2026; proposed rate announced June 2, 2026)" — use the latest.
  effective_date: '2026-06-02',
  citation_url: FL_CITE,
});

const ec = () => ({
  name: 'Section 301',
  sub_category: 'Excess Capacity',
  rate: 'TBD',
  product_category: 'All goods',
  status: 'threatened',
  effective_date: '2026-03-11',
  citation_url: EC_CITE,
});

const dst = () => ({
  name: 'Additional (DSTs)',
  rate: 'TBD',
  product_category: 'All goods',
  status: 'threatened',
  effective_date: '2025-02-21',
  citation_url: DST_CITE,
});

// Extra tariffs keyed by ISO code (beyond the universal baseline).
// EU members additionally receive EU-wide forced-labour 10% + excess capacity (added in the loop).
const EXTRA = {
  DZ: [fl('12.5%')],
  AO: [fl('12.5%')],
  AR: [fl('10%')],
  AU: [fl('12.5%')],
  BS: [fl('12.5%')],
  BH: [fl('12.5%')],
  BD: [fl('10%'), ec()],
  BR: [
    { name: 'Section 301', sub_category: 'Unreasonable Policies', rate: '25%', product_category: 'All goods', status: 'threatened', effective_date: '2026-06-01', citation_url: 'https://ustr.gov/sites/default/files/files/Press/Releases/2026/Brazil%20Section%20301%20Actionability%20and%20Proposed%20Action%20FRN%206-1-26%20Final.pdf' },
    fl('12.5%'),
  ],
  KH: [fl('10%')],
  CA: [
    fl('10%'),
    { name: 'Additional (dairy and lumber)', rate: '250%', product_category: 'Dairy and lumber', status: 'threatened', effective_date: '2025-03-07', citation_url: '' },
    { name: 'Additional (aircraft)', rate: '50%', product_category: 'Aircraft', status: 'threatened', effective_date: '2026-01-29', citation_url: '' },
  ],
  CL: [fl('12.5%')],
  CN: [
    { name: 'Section 301', sub_category: 'Maritime cargo handling equipment', rate: '25%', product_category: 'All goods', status: 'delayed', effective_date: '2026-11-10', citation_url: '' },
    fl('12.5%'),
    ec(),
  ],
  CO: [fl('12.5%')],
  CR: [fl('12.5%')],
  DO: [fl('12.5%')],
  EC: [fl('10%')],
  EG: [fl('12.5%')],
  SV: [fl('10%')],
  GT: [fl('10%')],
  GY: [fl('12.5%')],
  HN: [fl('12.5%')],
  HK: [fl('12.5%')],
  IN: [fl('12.5%'), ec()],
  ID: [fl('10%'), ec()],
  IQ: [fl('12.5%')],
  IL: [fl('12.5%')],
  JP: [fl('12.5%'), ec()],
  JO: [fl('12.5%')],
  KZ: [fl('12.5%')],
  KW: [fl('12.5%')],
  LY: [fl('12.5%')],
  MY: [fl('10%'), ec()],
  MX: [fl('10%'), ec()],
  MA: [fl('12.5%')],
  NZ: [fl('12.5%')],
  NI: [
    { name: 'Section 301', sub_category: 'Labor Rights, Human Rights and Fundamental Freedoms, and the Rule of Law', rate: '0%', product_category: 'All goods (CAFTA-DR originating); rises to 10% in 2027, 15% from 2028', status: 'implemented', effective_date: '2026-01-01', citation_url: 'https://www.federalregister.gov/d/2025-19635' },
    fl('12.5%'),
  ],
  NG: [fl('12.5%')],
  NO: [fl('12.5%'), ec()],
  OM: [fl('12.5%')],
  PK: [fl('10%')],
  PE: [fl('12.5%')],
  PH: [fl('12.5%')],
  QA: [fl('12.5%')],
  RU: [
    fl('12.5%'),
    { name: 'Ukraine-related sanctions', rate: '500%', product_category: 'All goods', status: 'threatened', effective_date: '2026-01-07', citation_url: '' },
  ],
  SA: [fl('12.5%')],
  SG: [fl('12.5%'), ec()],
  ZA: [fl('12.5%')],
  KR: [fl('12.5%'), ec()],
  LK: [fl('12.5%')],
  CH: [fl('12.5%'), ec()],
  TW: [fl('10%'), ec()],
  TH: [fl('12.5%'), ec()],
  TT: [fl('12.5%')],
  TR: [fl('12.5%'), dst()],
  AE: [fl('12.5%')],
  GB: [fl('10%'), dst()],
  UY: [fl('12.5%')],
  VE: [fl('12.5%')],
  VN: [
    { name: 'Section 301', sub_category: 'Intellectual Property', rate: 'TBD', product_category: 'All goods', status: 'threatened', effective_date: '2026-05-29', citation_url: 'https://www.federalregister.gov/d/2026-11043' },
    fl('12.5%'),
    ec(),
  ],
  // EU members with their own additional tariffs (EU-wide forced-labour + excess capacity added separately):
  FR: [{ name: 'Additional (alcohol products)', rate: '200%', product_category: 'Alcohol products', status: 'threatened', effective_date: '2026-01-19', citation_url: '' }],
  AT: [dst()],
  ES: [dst()],
};

// --- Section 232 product tariffs: per-country exemption/modified rates ---
// Rates with "*" are the highest tier of a content/duty-based formula (rule 3).
// Aerospace-only exemptions (EU/JP/TW on aluminum, steel, copper) are skipped (rule 4a).
const AUTO_CITE = 'https://www.federalregister.gov/documents/2025/04/03/2025-05930/adjusting-imports-of-automobiles-and-automobile-parts-into-the-united-states';
const PHARMA_CITE = 'https://www.whitehouse.gov/presidential-actions/2026/04/adjusting-imports-of-pharmaceuticals-and-pharmaceutical-ingredients-into-the-united-states/';
const METALS_CITE = 'https://www.whitehouse.gov/presidential-actions/2026/04/strengthening-actions-taken-to-adjust-imports-of-aluminum-steel-and-copper-into-the-united-states/';

// When a sub-row exists (e.g. "Kitchen cabinets and vanities"), it becomes the
// product_category itself rather than a sub_category under the parent product.
const s232 = (product, sub, rate, date, cite) => ({
  name: 'Section 232',
  rate,
  product_category: sub || product,
  status: 'implemented',
  effective_date: date,
  citation_url: cite,
});

const S232_EU = [
  s232('Automobiles', null, '15%*', '2025-08-01', AUTO_CITE),
  s232('Automobile parts', null, '15%*', '2025-08-01', AUTO_CITE),
  s232('Lumber, timber, and derivative products', 'Upholstered wooden furniture', '15%*', '2025-10-14', ''),
  s232('Lumber, timber, and derivative products', 'Kitchen cabinets and vanities', '15%*', '2025-10-14', ''),
  s232('Pharmaceuticals, pharmaceutical ingredients, and derivative products', null, '15%*', '2026-07-31', PHARMA_CITE),
  s232('Trucks and truck parts', 'Medium- and heavy-duty vehicles', '15%*', '2025-11-01', ''),
];

const S232 = {
  GB: [
    s232('Automobiles', null, '10%', '2025-06-23', AUTO_CITE),
    s232('Automobile parts', null, '10%', '2025-05-03', AUTO_CITE),
    s232('Lumber, timber, and derivative products', 'Upholstered wooden furniture', '10%', '2025-10-14', ''),
    s232('Lumber, timber, and derivative products', 'Kitchen cabinets and vanities', '10%', '2025-10-14', ''),
    s232('Pharmaceuticals, pharmaceutical ingredients, and derivative products', null, '10%', '2026-07-31', PHARMA_CITE),
    s232('Aluminum articles and derivative products', null, '25%*', '2026-04-06', METALS_CITE),
    s232('Steel articles and derivative products', null, '25%*', '2025-06-16', METALS_CITE),
  ],
  JP: [
    s232('Automobiles', null, '15%*', '2025-09-16', AUTO_CITE),
    s232('Automobile parts', null, '15%*', '2025-09-16', AUTO_CITE),
    s232('Lumber, timber, and derivative products', 'Upholstered wooden furniture', '15%*', '2025-10-14', ''),
    s232('Lumber, timber, and derivative products', 'Kitchen cabinets and vanities', '15%*', '2025-10-14', ''),
    s232('Pharmaceuticals, pharmaceutical ingredients, and derivative products', null, '15%*', '2026-07-31', PHARMA_CITE),
    s232('Trucks and truck parts', 'Medium- and heavy-duty vehicles', '15%*', '2025-11-01', ''),
  ],
  KR: [
    s232('Automobiles', null, '15%*', '2025-11-01', AUTO_CITE),
    s232('Automobile parts', null, '15%*', '2025-11-01', AUTO_CITE),
    s232('Lumber, timber, and derivative products', 'Upholstered wooden furniture', '15%*', '2025-11-14', ''),
    s232('Lumber, timber, and derivative products', 'Kitchen cabinets and vanities', '15%*', '2025-11-14', ''),
    s232('Pharmaceuticals, pharmaceutical ingredients, and derivative products', null, '15%*', '2026-07-31', PHARMA_CITE),
    s232('Trucks and truck parts', 'Medium- and heavy-duty vehicles', '15%*', '2025-11-01', ''),
  ],
  TW: [
    s232('Automobile parts', null, '15%*', '2026-05-01', AUTO_CITE),
    s232('Lumber, timber, and derivative products', 'Upholstered wooden furniture', '15%*', '2026-05-01', ''),
    s232('Lumber, timber, and derivative products', 'Kitchen cabinets and vanities', '15%*', '2026-05-01', ''),
  ],
  LI: [
    s232('Pharmaceuticals, pharmaceutical ingredients, and derivative products', null, '15%*', '2026-07-31', PHARMA_CITE),
  ],
  CH: [
    s232('Pharmaceuticals, pharmaceutical ingredients, and derivative products', null, '15%*', '2026-07-31', PHARMA_CITE),
  ],
  CA: [
    s232('Trucks and truck parts', 'Medium- and heavy-duty vehicle parts', '0%', '2025-11-01', ''),
  ],
  MX: [
    s232('Trucks and truck parts', 'Medium- and heavy-duty vehicle parts', '0%', '2025-11-01', ''),
  ],
};

const mkDeal = (name, date, url) => ({ name, announcement_date: date, citation_url: url });
const AGREE = 'Reciprocal Trade Agreement';
const FRAME = 'Reciprocal Trade Framework';

const DEALS = {
  AR: mkDeal(AGREE, '2026-02-05', 'https://ustr.gov/about/policy-offices/press-office/press-releases/2026/february/ambassador-greer-signs-united-states-argentina-agreement-reciprocal-trade-and-investment'),
  BD: mkDeal(AGREE, '2026-02-09', 'https://ustr.gov/about/policy-offices/press-office/press-releases/2026/february/ambassador-greer-signs-united-states-bangladesh-agreement-reciprocal-trade'),
  KH: mkDeal(AGREE, '2025-10-26', 'https://www.whitehouse.gov/briefings-statements/2025/10/agreement-between-the-united-states-of-america-and-the-kingdom-of-cambodia-on-reciprocal-trade/'),
  EC: mkDeal(FRAME, '2025-11-13', 'https://www.whitehouse.gov/briefings-statements/2025/11/joint-statement-on-framework-for-united-states-ecuador-agreement-on-reciprocal-trade/'),
  SV: mkDeal(AGREE, '2026-01-29', 'https://ustr.gov/sites/default/files/files/Press/Releases/2026/El%20Salvador%20Agreement%201.29%20FINAL.pdf'),
  GT: mkDeal(AGREE, '2026-01-30', 'https://ustr.gov/sites/default/files/files/Press/Releases/2026/Guatemala%20ART%201.30%20for%20posting%20CLEAN.pdf'),
  IN: mkDeal(FRAME, '2026-02-09', 'https://www.whitehouse.gov/fact-sheets/2026/02/fact-sheet-the-united-states-and-india-announce-historic-trade-deal/'),
  ID: mkDeal(AGREE, '2026-02-19', 'https://ustr.gov/sites/default/files/files/Press/Releases/2026/02.19.26%20US-IDN%20ART%20Full%20Agreement%20-%20US%20Final%20for%20Website%20sanitized.pdf'),
  JP: mkDeal(AGREE, '2025-09-04', 'https://www.federalregister.gov/d/2025-17389'),
  LI: mkDeal(FRAME, '2025-11-14', 'https://www.whitehouse.gov/briefings-statements/2025/11/joint-statement-on-a-framework-for-a-united-states-switzerland-liechtenstein-agreement-on-fair-balanced-and-reciprocal-trade/'),
  MY: mkDeal(AGREE, '2025-10-26', 'https://www.whitehouse.gov/briefings-statements/2025/10/agreement-between-the-united-states-of-america-and-malaysia-on-recipricol-trade/'),
  MK: mkDeal(FRAME, '2026-02-12', 'https://www.whitehouse.gov/briefings-statements/2026/02/joint-statement-on-a-framework-for-united-states-north-macedonia-agreement-on-reciprocal-fair-and-balanced-trade/'),
  PK: mkDeal(AGREE, '2025-07-31', ''),
  PH: mkDeal(AGREE, '2025-07-22', ''),
  KR: mkDeal(AGREE, '2025-11-13', 'https://www.federalregister.gov/d/2025-21940'),
  CH: mkDeal(FRAME, '2025-11-14', 'https://www.whitehouse.gov/briefings-statements/2025/11/joint-statement-on-a-framework-for-a-united-states-switzerland-liechtenstein-agreement-on-fair-balanced-and-reciprocal-trade/'),
  TW: mkDeal(AGREE, '2026-02-12', 'https://ustr.gov/about/policy-offices/press-office/press-releases/2026/february/ambassador-greer-oversees-signing-us-taiwan-agreement-reciprocal-trade'),
  GB: mkDeal(AGREE, '2025-06-16', 'https://www.federalregister.gov/executive-order/14309'),
  VN: mkDeal(FRAME, '2025-10-26', 'https://www.whitehouse.gov/briefings-statements/2025/10/joint-statement-on-united-states-vietnam-framework-for-an-agreement-on-reciprocal-fair-and-balanced-trade/'),
};

const EU_DEAL = mkDeal(AGREE, '2025-09-05', 'https://www.federalregister.gov/d/2025-17507');

data.tariffs = data.tariffs.map((entry) => {
  const isEU = / \(EU\)$/.test(entry.country);
  const types = [baseline()];
  if (isEU) types.push(fl('10%'), ec());
  if (EXTRA[entry.country_code]) types.push(...EXTRA[entry.country_code]);
  if (isEU) types.push(...S232_EU);
  if (S232[entry.country_code]) types.push(...S232[entry.country_code]);

  const deals = [];
  if (isEU) deals.push(EU_DEAL);
  if (DEALS[entry.country_code]) deals.push(DEALS[entry.country_code]);

  return {
    country: entry.country,
    country_code: entry.country_code,
    tariff_types: types,
    deals,
  };
});

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');

const withExtra = data.tariffs.filter((t) => t.tariff_types.length > 1).length;
const withDeals = data.tariffs.filter((t) => t.deals.length > 0).length;
console.log(`Total countries: ${data.tariffs.length}`);
console.log(`With tariffs beyond baseline: ${withExtra}`);
console.log(`With deals: ${withDeals}`);
