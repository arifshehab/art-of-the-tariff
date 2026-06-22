"""
Generate imports_by_country_gtap.json from imports_by_country_gtap_2024.csv.

Takes the GTAP imports-by-country CSV (file 1) and produces a JSON file in the
same shape as total_imports.json (file 2): a top-level object with a list of
country records under "countries". Each record carries country_name, code (the
2-letter ISO country code) and region, followed by every column from the CSV
except cty_code.

The 2-letter code and region are looked up from total_imports.json, joined on
country_name (which matches exactly across both files).
"""

import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

CSV_PATH = os.path.normpath(
    os.path.join(
        HERE, "..", "..", "..",
        "tariff-rate-tracker", "output", "imports_by_country_gtap_2024.csv",
    )
)
LOOKUP_PATH = os.path.join(HERE, "total_imports.json")
OUTPUT_PATH = os.path.join(HERE, "imports_by_country_gtap.json")

# Columns from the CSV that should NOT be copied into the per-country fields.
DROP_COLUMNS = {"cty_code"}

# Integer-valued CSV columns (everything except country_name) get converted to
# numbers so the JSON holds numeric values rather than strings.
TEXT_COLUMNS = {"country_name"}


def load_reference(path):
    """Read total_imports.json: return (lookup, last_updated, source).

    lookup maps country_name -> {"code", "region"}.
    """
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    lookup = {
        c["country_name"]: {"code": c["code"], "region": c["region"]}
        for c in data["countries"]
    }
    return lookup, data.get("last_updated"), data.get("source")


def to_number(value):
    """Convert a CSV cell to int when possible, else float, else leave as-is."""
    if value is None or value == "":
        return value
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value


def main():
    lookup, last_updated, source = load_reference(LOOKUP_PATH)

    countries = []
    missing = []

    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["country_name"]
            meta = lookup.get(name)
            if meta is None:
                missing.append(name)
                continue

            record = {
                "country_name": name,
                "code": meta["code"],
                "region": meta["region"],
            }
            for col, val in row.items():
                if col in DROP_COLUMNS or col == "country_name":
                    continue
                record[col] = val if col in TEXT_COLUMNS else to_number(val)

            countries.append(record)

    if missing:
        raise SystemExit(
            "No code/region lookup for: " + ", ".join(missing)
        )

    output = {
        "last_updated": last_updated,
        "source": source,
        "countries": countries,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(countries)} countries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
