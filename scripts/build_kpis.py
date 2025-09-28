#!/usr/bin/env python3
import csv, json, os, sys, subprocess, urllib.request, pathlib, traceback

print("::: build_kpis.py start", flush=True)

ROOT = pathlib.Path(__file__).resolve().parents[1]
AGG  = ROOT / "capitol_league_rollcall_aggregate.py"
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

print(f"ROOT={ROOT}", flush=True)
print(f"AGG exists? {AGG.exists()} path={AGG}", flush=True)
print(f"DIST={DIST}", flush=True)

try:
    # 1) Run aggregator -> bioguide_kpis.csv
    bioguide_csv = DIST / "bioguide_kpis.csv"
    cmd = [
        sys.executable, str(AGG),
        "--house-years", os.environ.get("HOUSE_YEARS", "2024-2025"),
        "--congress",    os.environ.get("CONGRESSES", "118-119"),
        "-o", str(bioguide_csv),
    ]
    print("Running aggregator:", " ".join(cmd), flush=True)
    subprocess.check_call(cmd)

    # 2) Map Bioguide -> GovTrack using legislators-current.json
    LEG_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json"
    print("Downloading legislators:", LEG_URL, flush=True)
    with urllib.request.urlopen(LEG_URL) as r:
        leg = json.load(r)
    bio2gt = {
        m["id"]["bioguide"]: str(m["id"]["govtrack"])
        for m in leg
        if "id" in m and "bioguide" in m["id"] and "govtrack" in m["id"]
    }

    # 3) Emit kpis.csv and kpis.json keyed by GovTrack
    kpis_csv  = DIST / "kpis.csv"
    kpis_json = DIST / "kpis.json"
    obj = {}

    print(f"Reading {bioguide_csv}", flush=True)
    with open(bioguide_csv, newline="", encoding="utf-8") as inp, \
         open(kpis_csv, "w", newline="", encoding="utf-8") as out:
        r = csv.DictReader(inp)
        w = csv.writer(out)
        w.writerow(["govtrack", "total_votes", "missed_votes"])
        for row in r:
            bio = row.get("bioguide") or row.get("bioguide_id") or row.get("bioguideId")
            if not bio:
                continue
            gt = bio2gt.get(bio)
            if not gt:
                continue
            total = int(str(row.get("total_votes", 0)).replace(",", "") or 0)
            miss  = int(str(row.get("missed_votes", 0)).replace(",", "") or 0)
            obj[gt] = {"total_votes": total, "missed_votes": miss}
            w.writerow([gt, total, miss])

    with open(kpis_json, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

    print(f"Wrote: {kpis_csv} and {kpis_json} records: {len(obj)}", flush=True)
except Exception as e:
    print("ERROR:", e, flush=True)
    traceback.print_exc()
    sys.exit(1)
