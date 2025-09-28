#!/usr/bin/env python3
"""
Aggregate per-member vote totals and missed votes from official House and Senate roll-call feeds.
Outputs CSV: bioguide,total_votes,missed_votes

Usage examples:
  python capitol_league_rollcall_aggregate.py --house-years 1990-2025 --congress 101-118 -o votes_missed.csv
  python capitol_league_rollcall_aggregate.py --house-years 2023-2025 --congress 118-118 -o votes_118.csv

Notes:
- Keys are official Bioguide IDs. Map to GovTrack IDs later if needed.
- "Missed" == position in {"Not Voting", "Absent"} (case-insensitive).
- Script is resilient to XML schema differences and skips malformed files.
"""

import argparse
import csv
import sys
import time
from collections import defaultdict
from typing import Dict, Iterable, Optional, Tuple
from xml.etree import ElementTree as ET

try:
    import requests  # type: ignore
except Exception as e:
    print("This script requires the 'requests' package. Install with: pip install requests", file=sys.stderr)
    raise

HOUSE_URL = "https://clerk.house.gov/evs/{year}/roll{num:03d}.xml"
SENATE_MENU_URL = "https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{congress}_{session}.xml"
SENATE_VOTE_URL = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}_{session}/vote_{congress}_{session}_{num:05d}.xml"

MISS_TOKENS = {"not voting", "absent"}

def parse_range(s: str) -> Tuple[int, int]:
    if "-" in s:
        a, b = s.split("-", 1)
        return int(a), int(b)
    v = int(s)
    return v, v

def http_get(url: str, timeout: float = 15.0) -> Optional[requests.Response]:
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=timeout)
            if r.status_code == 200 and r.content:
                return r
            if r.status_code in (404, 410):
                return None
            # throttle on non-200
            time.sleep(0.5 * (attempt + 1))
        except requests.RequestException:
            time.sleep(0.5 * (attempt + 1))
    return None

def find_text(elem: ET.Element, path_variants: Iterable[str]) -> Optional[str]:
    for p in path_variants:
        found = elem.find(p)
        if found is not None and (found.text is not None):
            t = found.text.strip()
            if t:
                return t
    return None

def get_attr_any(elem: ET.Element, attr_variants: Iterable[str]) -> Optional[str]:
    for a in attr_variants:
        v = elem.attrib.get(a)
        if v:
            v = v.strip()
            if v:
                return v
    return None

def normalize_vote_text(t: Optional[str]) -> str:
    if not t:
        return ""
    return t.strip().lower()

def extract_bioguide_from_house_recorded_vote(rv: ET.Element) -> Optional[str]:
    """
    House XML often looks like:
      <recorded-vote>
        <legislator name-id="A000055" ...>Surname, First</legislator>
        <vote>Yea</vote>
      </recorded-vote>
    Sometimes attributes differ; try a few ways.
    """
    # Primary: <legislator name-id="A000055">
    leg = rv.find("./legislator")
    if leg is not None:
        gid = get_attr_any(leg, ("name-id", "bioguide_id", "bioguide", "bioguide-id"))
        if gid:
            return gid
        # Fallback if bioguide in text children
        gid = find_text(leg, ("./bioguide_id", "./bioguide", "./bioguide-id"))
        if gid:
            return gid

    # Some feeds use <legislator bioguide_id="...">
    gid = get_attr_any(rv, ("bioguide_id", "bioguide", "bioguide-id"))
    if gid:
        return gid
    # Last resort: scan all attributes for something that looks like an ID pattern (A000055 etc.)
    for e in rv.iter():
        for k, v in e.attrib.items():
            v2 = v.strip()
            if len(v2) == 7 and v2[0].isalpha() and v2[1:].isdigit():
                return v2
    return None

def extract_vote_from_house_recorded_vote(rv: ET.Element) -> Optional[str]:
    # Common: <vote>Yea</vote>
    v = find_text(rv, ("./vote",))
    return v

def parse_house_vote_xml(xml_bytes: bytes, totals: Dict[str, int], missed: Dict[str, int]) -> None:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return
    # Try both common paths
    recorded_votes = list(root.findall(".//recorded-vote"))
    if not recorded_votes:
        # Some older files use <record-vote>
        recorded_votes = list(root.findall(".//record-vote"))
    for rv in recorded_votes:
        gid = extract_bioguide_from_house_recorded_vote(rv)
        if not gid:
            continue
        vote_text = extract_vote_from_house_recorded_vote(rv)
        totals[gid] += 1
        if normalize_vote_text(vote_text) in MISS_TOKENS:
            missed[gid] += 1

def iter_house(year_start: int, year_end: int) -> Iterable[Tuple[int, bytes]]:
    for y in range(year_start, year_end + 1):
        consecutive_misses = 0
        n = 1
        while True:
            url = HOUSE_URL.format(year=y, num=n)
            r = http_get(url)
            if not r:
                consecutive_misses += 1
                # stop after 25 consecutive gaps to avoid scanning the whole year if early stop
                if consecutive_misses >= 25:
                    break
            else:
                consecutive_misses = 0
                yield (y, r.content)
            n += 1
            time.sleep(0.12)  # polite pacing

def parse_senate_vote_xml(xml_bytes: bytes, totals: Dict[str, int], missed: Dict[str, int]) -> None:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return

    # Typical path: /roll_call_vote/members/member
    for m in root.findall(".//member"):
        gid = find_text(m, ("./bioguide_id", "./bioguide", "./bioguide-id"))
        if not gid:
            # Try attributes as backup
            gid = get_attr_any(m, ("bioguide_id", "bioguide", "bioguide-id"))
        if not gid:
            continue
        v = find_text(m, ("./vote_cast", "./vote", "./position"))
        totals[gid] += 1
        if normalize_vote_text(v) in MISS_TOKENS or normalize_vote_text(v) in {"present not voting"}:
            missed[gid] += 1

def iter_senate(cong_start: int, cong_end: int) -> Iterable[Tuple[str, int, bytes]]:
    for c in range(cong_start, cong_end + 1):
        for s in (1, 2):
            menu_url = SENATE_MENU_URL.format(congress=c, session=s)
            menu = http_get(menu_url)
            if not menu:
                continue
            try:
                menu_root = ET.fromstring(menu.content)
            except ET.ParseError:
                continue
            # In menu, votes listed with <vote_number> elements
            vote_nums = []
            for v in menu_root.findall(".//vote_number"):
                try:
                    vote_nums.append(int(v.text.strip()))
                except Exception:
                    pass
            if not vote_nums:
                # fallback: try to infer count up to 1000
                vote_nums = list(range(1, 1001))

            for num in sorted(set(vote_nums)):
                vote_url = SENATE_VOTE_URL.format(congress=c, session=s, num=num)
                r = http_get(vote_url)
                if not r:
                    continue
                yield (f"{c}_{s}", num, r.content)
                time.sleep(0.12)

def main():
    ap = argparse.ArgumentParser(description="Aggregate per-member votes and missed votes from official House and Senate feeds.")
    ap.add_argument("--house-years", default="2023-2025", help="Year range for House EVS, e.g., 1990-2025 or single year 2024")
    ap.add_argument("--congress", default="118-118", help="Congress range for Senate, e.g., 101-118")
    ap.add_argument("-o", "--output", default="votes_missed.csv", help="Output CSV path")
    args = ap.parse_args()

    y0, y1 = parse_range(args.house_years)
    c0, c1 = parse_range(args.congress)

    totals: Dict[str, int] = defaultdict(int)
    missed: Dict[str, int] = defaultdict(int)

    # House
    for _year, xml_bytes in iter_house(y0, y1):
        parse_house_vote_xml(xml_bytes, totals, missed)

    # Senate
    for _cong_sess, _num, xml_bytes in iter_senate(c0, c1):
        parse_senate_vote_xml(xml_bytes, totals, missed)

    # Write CSV
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["bioguide", "total_votes", "missed_votes"])
        for gid in sorted(totals.keys()):
            w.writerow([gid, totals[gid], missed.get(gid, 0)])

    print(f"Wrote {args.output}. Rows: {len(totals)}")

if __name__ == "__main__":
    main()
