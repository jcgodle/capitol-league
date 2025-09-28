#!/usr/bin/env python3
import csv, json, sys, urllib.request
if len(sys.argv)<3:
    print("usage: map_bioguide_to_govtrack.py bioguide_kpis.csv out_kpis.csv [out_kpis.json]"); sys.exit(1)
inp, out_csv = sys.argv[1], sys.argv[2]
out_json = sys.argv[3] if len(sys.argv)>3 else None
LEG_URL="https://unitedstates.github.io/congress-legislators/legislators-current.json"
leg=json.load(urllib.request.urlopen(LEG_URL))
bio2gt={m["id"]["bioguide"]: str(m["id"]["govtrack"]) for m in leg if "bioguide" in m["id"] and "govtrack" in m["id"]}
obj={}
with open(inp, newline='', encoding='utf-8') as f, open(out_csv,'w',newline='',encoding='utf-8') as g:
    r=csv.DictReader(f); w=csv.writer(g); w.writerow(["govtrack","total_votes","missed_votes"])
    for row in r:
        gt=bio2gt.get(row.get("bioguide") or row.get("bioguide_id") or row.get("bioguideId"))
        if not gt: continue
        total=int(str(row.get("total_votes",0)).replace(",","") or 0)
        miss=int(str(row.get("missed_votes",0)).replace(",","") or 0)
        obj[gt]={"total_votes": total, "missed_votes": miss}
        w.writerow([gt,total,miss])
if out_json:
    import json; open(out_json,'w',encoding='utf-8').write(json.dumps(obj,indent=2))
