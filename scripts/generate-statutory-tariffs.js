#!/usr/bin/env node
/*
 * generate-statutory-tariffs.js
 *
 * Builds a consolidated tariff JSON for a given date.
 *
 * Pipeline:
 *   1. Take a date (defaults to today).
 *   2. In .../statutory_rates/updated, pick the snapshot whose
 *      "policy_effective_date" is the latest date <= the given date. This snapshot
 *      is the SOURCE OF TRUTH for which tariffs apply to which country and at what rate.
 *   3. Pull effective_date + citation_url for each tariff from master_tariff_list.json.
 *   4. Emit { last_updated, tariffs: Tariff[] }.
 *
 * Usage:
 *   node generate-statutory-tariffs.js [YYYY-MM-DD] [outputPath]
 *
 * See the "OPEN QUESTIONS" block at the bottom of this file for assumptions made.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const UPDATED_DIR =
  'C:/Users/arif_/Documents/Claude/tariff-rate-tracker/data/statutory_rates/updated';
const MASTER_PATH =
  'C:/Users/arif_/Documents/Claude/tariff-rate-tracker/data/statutory_rates/updated/master_tariff_list.json';
const CENSUS_PATH =
  'C:/Users/arif_/Documents/Claude/Tariff Tracker/tariff-tracker/data/census_to_iso.json';
const DEALS_XLSX_PATH =
  'C:/Users/arif_/Documents/Claude/Tariff Tracker/tariff-tracker/data/trump_2.0_trade_deals.xlsx';

// EU member states, by ISO-2 code (27 members). Used to append "(EU)" to the
// country name. Source: existing data/tariffs.json EU-flagged rows.
const EU_ISO2 = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
]);

// Manual country-name overrides, keyed by census_code. Applied after
// parenthesis-stripping but before the "(EU)" suffix. Use for names the raw
// data spells awkwardly (e.g. "Denmark, except Greenland").
const NAME_OVERRIDES = {
  '4099': 'Denmark', // Denmark, except Greenland
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Strip any "(...)" segments from a country name and collapse whitespace.
function stripParens(name) {
  return name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

// Emit the raw fractional rate as a string, e.g. 0.5 -> "0.5".
function formatRate(rate) {
  return String(rate);
}

// ---------------------------------------------------------------------------
// Minimal, dependency-free .xlsx reader
// ---------------------------------------------------------------------------
// An .xlsx is a ZIP. We read its central directory, inflate the two parts we
// need (sharedStrings.xml + the first worksheet), and parse the XML with
// regexes. In this workbook every cell value (including dates) is stored as a
// shared string, so no numeric/date conversion is required.

// Extract a single entry from a ZIP buffer by name. Returns a Buffer or null.
function zipExtract(buf, name) {
  // Locate End Of Central Directory record (signature 0x06054b50).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('xlsx: EOCD not found (not a zip?)');

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16); // start of central directory

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break; // central dir header sig
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const entryName = buf.toString('utf8', off + 46, off + 46 + nameLen);

    if (entryName === name) {
      // Jump to the local header to find the real data offset.
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(dataStart, dataStart + compSize);
      return method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&'); // must be last
}

// Read the trade-deals workbook into a list of row objects keyed by header.
function readDealsXlsx(p) {
  if (!fs.existsSync(p)) {
    console.error(`[warn] deals workbook not found: ${p}; deals will be empty`);
    return [];
  }
  const buf = fs.readFileSync(p);

  // Shared strings, in index order.
  const ssXml = zipExtract(buf, 'xl/sharedStrings.xml');
  const shared = [];
  if (ssXml) {
    const xml = ssXml.toString('utf8');
    const siRe = /<si>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = siRe.exec(xml))) {
      // An <si> may hold multiple <t> runs; concatenate them.
      const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
      shared.push(decodeXmlEntities(parts.join('')));
    }
  }

  // First worksheet (xlsx is 1-indexed: sheet1.xml).
  const sheetXml = zipExtract(buf, 'xl/worksheets/sheet1.xml');
  if (!sheetXml) throw new Error('xlsx: sheet1.xml not found');
  const xml = sheetXml.toString('utf8');

  const rows = [];
  for (const rowM of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cM of rowM[1].matchAll(/<c r="([A-Z]+)\d+"(?:[^>]*?\st="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
      const col = cM[1];
      const type = cM[2];
      const inner = cM[3];
      const vM = inner.match(/<v>([\s\S]*?)<\/v>/);
      let val = vM ? vM[1] : '';
      if (type === 's') {
        val = shared[Number(val)] ?? '';
      } else if (type === 'inlineStr') {
        const tM = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = tM ? decodeXmlEntities(tM[1]) : '';
      } else {
        val = decodeXmlEntities(val);
      }
      cells[col] = val;
    }
    rows.push(cells);
  }
  if (!rows.length) return [];

  // First row is the header; map subsequent rows to objects.
  const header = rows[0];
  const cols = Object.keys(header).sort();
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    let empty = true;
    for (const c of cols) {
      const key = header[c];
      if (!key) continue;
      const v = rows[i][c] ?? '';
      if (v !== '') empty = false;
      obj[key] = v;
    }
    if (!empty) records.push(obj);
  }
  return records;
}

// Build a lookup: normalised country name -> [deal, ...].
//
// A workbook row's country_name may name a group rather than one country:
//   - "European Union"            -> applies to every EU member (handled via the
//                                    isEU flag at match time, key "__eu__")
//   - "Switzerland / Liechtenstein" -> slash-separated; applies to each part
function buildDealsIndex(records) {
  const idx = new Map();
  const add = (key, r) => {
    const k = key.trim().toLowerCase();
    if (!k) return;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(r);
  };
  for (const r of records) {
    const raw = (r.country_name || '').trim();
    if (!raw) continue;
    if (/^european union$/i.test(raw)) {
      add('__eu__', r);
    } else if (raw.includes('/')) {
      for (const part of raw.split('/')) add(part, r);
    } else {
      add(raw, r);
    }
  }
  return idx;
}

// Collect the deals applicable to a country: direct name match plus, for EU
// members, any EU-wide deals.
function dealsFor(idx, baseName, isEU) {
  const out = [...(idx.get(baseName.toLowerCase()) || [])];
  if (isEU) out.push(...(idx.get('__eu__') || []));
  return out;
}

// ---------------------------------------------------------------------------
// Step 2: choose the source-of-truth snapshot
// ---------------------------------------------------------------------------
function pickSourceFile(date) {
  const files = fs
    .readdirSync(UPDATED_DIR)
    .filter((f) => f.toLowerCase().endsWith('.json') && f !== 'master_tariff_list.json');

  let best = null; // { file, ped }
  for (const f of files) {
    let ped;
    try {
      ped = readJSON(path.join(UPDATED_DIR, f)).policy_effective_date;
    } catch {
      continue; // not a snapshot / unreadable
    }
    if (!ped) continue;
    if (ped <= date && (!best || ped > best.ped)) best = { file: f, ped };
  }

  if (!best) {
    throw new Error(`No snapshot in ${UPDATED_DIR} with policy_effective_date <= ${date}`);
  }
  return best;
}

// ---------------------------------------------------------------------------
// Step 3: resolve effective_date + citation_url from the master list
// ---------------------------------------------------------------------------
// For a given master tariff record, pick the relevant effective_date entry per
// the spec's logic. Entries are either:
//   - "base"    entries: have base_date  (apply to everyone, no country_name)
//   - "country" entries: have adjust_date + country_name/census_code
//
// Matching of country entries is done by census_code (present in both the
// snapshot key and the master entry); falls back to country_name if needed.
function resolveMasterEntry(masterRecord, censusCode, countryName, date, ctx) {
  const entries = masterRecord.effective_date || [];

  // Most recent base entry on/before `date`.
  let base = null;
  // Most recent country entry (matching this country) on/before `date`.
  let country = null;

  for (const e of entries) {
    if (e.base_date !== undefined && e.country_name === undefined) {
      const d = e.base_date;
      if (d <= date && (!base || d > base.base_date)) base = e;
    } else if (e.adjust_date !== undefined) {
      const matches =
        (e.census_code && String(e.census_code) === String(censusCode)) ||
        (e.country_name && e.country_name === countryName);
      if (matches) {
        const d = e.adjust_date;
        if (d <= date && (!country || d > country.adjust_date)) country = e;
      }
    }
  }

  // Selection logic:
  //   (1) no country entry        -> base
  //   (2) no base entry           -> country
  //   (3) both exist              -> the most recent country entry
  let selected;
  if (!country) {
    selected = base;
  } else {
    selected = country;
  }

  if (!selected) {
    throw new Error(
      `${ctx}: no applicable master entry on/before ${date} for ` +
        `${masterRecord.tariff_authority}/${masterRecord.tariff_name}`
    );
  }

  return {
    effective_date: selected.base_date || selected.adjust_date,
    citation_url: selected.source || '',
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const date = process.argv[2] || todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date "${date}" - expected YYYY-MM-DD`);
  }

  const { file: srcFile, ped } = pickSourceFile(date);
  console.error(`[info] date=${date} -> source of truth: ${srcFile} (policy_effective_date=${ped})`);

  const source = readJSON(path.join(UPDATED_DIR, srcFile));
  const master = readJSON(MASTER_PATH);
  const census = readJSON(CENSUS_PATH);
  const dealRecords = readDealsXlsx(DEALS_XLSX_PATH);
  const dealsIndex = buildDealsIndex(dealRecords);
  const seenNames = new Set(); // lowercased base names processed
  let sawEU = false;

  // Index master by authority|name for quick lookup.
  const masterIndex = new Map();
  for (const m of master) {
    masterIndex.set(`${m.tariff_authority}|${m.tariff_name}`, m);
  }

  const tariffs = [];

  for (const [key, entry] of Object.entries(source)) {
    if (key === 'policy_effective_date') continue;

    const censusCode = entry.census_code || key;
    if (String(censusCode) === '1000') continue; // drop the US (importing country)
    const rawName = entry.name || '';
    const iso = census[censusCode];
    const countryCode = iso ? iso.iso2 : '';
    if (!iso) {
      console.error(`[warn] no ISO mapping for census_code ${censusCode} (${rawName})`);
    }

    const baseName = NAME_OVERRIDES[censusCode] || stripParens(rawName);
    const isEU = !!(countryCode && EU_ISO2.has(countryCode));
    seenNames.add(baseName.toLowerCase());
    if (isEU) sawEU = true;
    let country = baseName;
    if (isEU) country = `${country} (EU)`;

    // Match trade deals by country name (parens/EU-suffix stripped), plus
    // EU-wide deals for EU members.
    const deals = dealsFor(dealsIndex, baseName, isEU);

    const tariff_types = [];
    for (const t of entry.tariffs || []) {
      const mKey = `${t.tariff_authority}|${t.tariff_name}`;
      const masterRecord = masterIndex.get(mKey);
      if (!masterRecord) {
        console.error(`[warn] ${rawName}: no master record for ${mKey}; skipping`);
        continue;
      }

      const { effective_date, citation_url } = resolveMasterEntry(
        masterRecord,
        censusCode,
        // Match master country_name against the de-parenthesised name.
        stripParens(rawName),
        date,
        rawName
      );

      const tt = {
        authority: t.tariff_authority,
        name: t.tariff_name,
        rate: formatRate(t.tariff_rate),
        status: 'active',
        effective_date,
        citation_url,
      };
      if (t.comment !== undefined) tt.comment = t.comment;
      tariff_types.push(tt);
    }

    tariffs.push({
      country,
      country_code: countryCode,
      tariff_types,
      deals,
    });
  }

  // Warn about any deal row that matched zero countries (e.g. a spelling that
  // differs from the snapshot, like Denmark needed an override).
  for (const r of dealRecords) {
    const raw = (r.country_name || '').trim();
    if (!raw) continue;
    let targets;
    if (/^european union$/i.test(raw)) targets = sawEU ? ['ok'] : [];
    else if (raw.includes('/')) targets = raw.split('/').filter((p) => seenNames.has(p.trim().toLowerCase()));
    else targets = seenNames.has(raw.toLowerCase()) ? ['ok'] : [];
    if (targets.length === 0) {
      console.error(`[warn] deal row "${raw}" matched no country; deal omitted from output`);
    }
  }

  const out = { last_updated: date, tariffs };

  const outPath =
    process.argv[3] ||
    path.join(__dirname, '..', 'data', `statutory_tariffs_${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.error(`[info] wrote ${tariffs.length} countries -> ${outPath}`);
}

main();

/* ===========================================================================
 * DECISIONS (confirmed) / NOTES
 * ===========================================================================
 * 1. `deals`: emitted as [] for all countries (confirmed: leave empty for now).
 * 2. `authority` / `name`: emitted verbatim as raw codes, e.g. "s232" / "steel"
 *    (confirmed: leave as raw codes for now).
 * 3. `rate`: emitted as the raw fractional value stringified, e.g. "0.5"
 *    (confirmed: keep as 0.5 for now).
 * 4. United States (census 1000) is dropped — it is the importing country.
 * 5. Country-entry matching in the master list uses census_code first, then
 *    country_name (confirmed). See note below.
 * 6. Master entry selection: no country entry -> base; otherwise use the most
 *    recent country entry (no date comparison / no hard error).
 * 7. Output path defaults to ../data/statutory_tariffs_<date>.json (confirmed);
 *    override with a second CLI argument.
 * =========================================================================== */
