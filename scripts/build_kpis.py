#!/usr/bin/env python3
"""Build attendance KPIs from official House/Senate roll-call feeds."""

import csv
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
AGGREGATOR = ROOT / "scripts" / "capitol_league_rollcall_aggregate.py"
DATA_DIR = ROOT / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

HOUSE_YEARS = os.environ.get("HOUSE_YEARS", "2025-2026")
CONGRESSES = os.environ.get("CONGRESSES", "119-119")
LEGISLATORS_URL = (
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        bioguide_csv = pathlib.Path(tmp) / "bioguide_kpis.csv"

        subprocess.check_call(
            [
                sys.executable,
                str(AGGREGATOR),
                "--house-years",
                HOUSE_YEARS,
                "--congress",
                CONGRESSES,
                "-o",
                str(bioguide_csv),
            ]
        )

        with urllib.request.urlopen(LEGISLATORS_URL) as response:
            legislators = json.load(response)

        bio_to_govtrack = {
            member["id"]["bioguide"]: str(member["id"]["govtrack"])
            for member in legislators
            if member.get("id", {}).get("bioguide")
            and member.get("id", {}).get("govtrack")
        }

        output_json = {}
        csv_path = DATA_DIR / "kpis.csv"
        json_path = DATA_DIR / "kpis.json"

        with bioguide_csv.open(newline="", encoding="utf-8") as source, csv_path.open(
            "w", newline="", encoding="utf-8"
        ) as target:
            reader = csv.DictReader(source)
            writer = csv.writer(target)
            writer.writerow(["govtrack", "total_votes", "missed_votes"])

            for row in reader:
                bioguide = (
                    row.get("bioguide")
                    or row.get("bioguide_id")
                    or row.get("bioguideId")
                )
                govtrack = bio_to_govtrack.get(bioguide)
                if not govtrack:
                    continue

                total = int(str(row.get("total_votes", 0)).replace(",", "") or 0)
                missed = int(str(row.get("missed_votes", 0)).replace(",", "") or 0)
                output_json[govtrack] = {
                    "total_votes": total,
                    "missed_votes": missed,
                }
                writer.writerow([govtrack, total, missed])

        json_path.write_text(json.dumps(output_json, indent=2), encoding="utf-8")

    print(f"Wrote {len(output_json)} KPI records to {DATA_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
