// fetch-census-iso-map.js
// -----------------------------------------------------------------------------
// Downloads the U.S. Census Bureau "Schedule C - Country Codes and Descriptions
// ISO" page and builds a census-code -> ISO-2 lookup used by
// build-statutory-tariffs.js.
//
// Source (authoritative): the snapshot files key on Census Schedule C codes
// (US=1000, Canada=1220, Mexico=2010), which is exactly what this page lists.
//   https://www.census.gov/foreign-trade/schedules/c/countrycodesiso.html
//
// Usage:  node fetch-census-iso-map.js
// Output: data/census_to_iso.json  ->  { "<census_code>": { name, iso2 }, ... }
//
// Requires Node 18+ (global fetch). Run this once (and re-run when Census
// updates Schedule C); build-statutory-tariffs.js reads the cached JSON.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const URL = 'https://www.census.gov/foreign-trade/schedules/c/countrycodesiso.html';
const OUT = path.join(__dirname, '..', 'data', 'census_to_iso.json');

async function main() {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${URL}`);
  const html = await res.text();

  // The page renders rows as table cells: <td>Name</td><td>CensusCode</td><td>ISO</td>
  // Pull every <tr> and grab its three <td> values.
  const map = {};
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let row;
  while ((row = rowRe.exec(html)) !== null) {
    const cells = [];
    let c;
    cellRe.lastIndex = 0;
    while ((c = cellRe.exec(row[1])) !== null) {
      cells.push(
        c[1]
          .replace(/<[^>]+>/g, '')   // strip nested tags
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .trim()
      );
    }
    if (cells.length < 3) continue;
    const [name, censusCode, iso2] = cells;
    // Census codes are 4-digit numeric; ISO is 2 letters. Skip header rows.
    if (!/^\d{3,4}$/.test(censusCode) || !/^[A-Z]{2}$/.test(iso2)) continue;
    map[censusCode] = { name, iso2 };
  }

  const count = Object.keys(map).length;
  if (count === 0) {
    throw new Error('Parsed 0 rows — the page markup may have changed. Inspect the HTML and adjust the parser.');
  }

  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  console.error(`Wrote ${count} census->ISO entries to ${OUT}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
