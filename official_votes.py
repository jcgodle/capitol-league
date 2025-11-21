"""
official_votes.py

Official roll-call vote helpers for Capitol League.

House:
  - Uses Clerk of the House rollcall XML.
Senate:
  - Stubbed to return [] for now; shape matches House results so we can
    plug it into master_state and the spiderweb later.
"""

import re
import datetime as dt
from typing import List, Dict, Any, Optional

import requests
import xml.etree.ElementTree as ET

HOUSE_INDEX_URL = "https://clerk.house.gov/evs/{year}/index.asp"
HOUSE_ROLL_RANGE_URL = "https://clerk.house.gov/evs/{year}/ROLL_{start}.asp"
HOUSE_ROLL_XML_URL = "https://clerk.house.gov/evs/{year}/roll{roll:03d}.xml"

SENATE_MENU_URL = "https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{congress}_{session}.xml"
SENATE_VOTE_XML_URL = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{congress}_{session}_{roll:05d}.xml"


def _safe_get(url: str, timeout: int = 30) -> Optional[str]:
    """
    Simple GET with a friendly User-Agent and debug logging.
    Returns response.text on 200, otherwise None.
    """
    try:
        resp = requests.get(
            url,
            timeout=timeout,
            headers={
                "User-Agent": "CapitolLeague/1.0 (+https://example.com)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        )
    except Exception as exc:
        print(f"[official_votes] ERROR fetching {url}: {exc}")
        return None

    print(f"[official_votes] GET {url} -> {resp.status_code}")
    if not resp.ok:
        return None

    return resp.text


def _parse_house_vote_xml(xml_text: str, xml_url: str) -> Optional[Dict[str, Any]]:
    """
    Parse a single House rollcall XML into a compact dict.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        print(f"[official_votes] XML parse error for {xml_url}: {exc}")
        return None

    metadata = root.find("vote-metadata")
    if metadata is None:
        print(f"[official_votes] No <vote-metadata> in {xml_url}")
        return None

    def get(tag: str) -> Optional[str]:
        el = metadata.find(tag)
        return el.text.strip() if el is not None and el.text else None

    congress = get("congress")
    session = get("session")
    rollcall = get("rollcall-num")
    legis_num = get("legis-num")
    vote_question = get("vote-question")
    vote_type = get("vote-type")
    vote_result = get("vote-result")
    action_date = get("action-date")
    action_time = get("action-time")
    vote_desc = get("vote-desc")

    totals_by_vote: Dict[str, int] = {}
    vote_totals = metadata.find("vote-totals")
    if vote_totals is not None:
        overall = vote_totals.find("totals-by-vote")
        if overall is not None:
            for tag, key in [
                ("yea-total", "yea"),
                ("nay-total", "nay"),
                ("present-total", "present"),
                ("not-voting-total", "notVoting"),
            ]:
                el = overall.find(tag)
                totals_by_vote[key] = int(el.text) if el is not None and el.text and el.text.isdigit() else 0

    by_party = []
    if vote_totals is not None:
        for pt in vote_totals.findall("totals-by-party"):
            party = pt.find("party").text if pt.find("party") is not None else "Unknown"
            entry = {
                "party": party,
                "yea": int(pt.findtext("yea-total") or 0),
                "nay": int(pt.findtext("nay-total") or 0),
                "present": int(pt.findtext("present-total") or 0),
                "notVoting": int(pt.findtext("not-voting-total") or 0),
            }
            by_party.append(entry)

    bill_code = None
    congress_gov_url = None
    if legis_num:
        parts = legis_num.split()
        if len(parts) >= 2:
            chamber_abbrev = parts[0]
            bill_type = parts[1]
            number = parts[-1]
            bill_code = " ".join(parts)
            if congress and number.isdigit():
                c_int = int(congress)
                bill_type_lower = None
                if chamber_abbrev == "H" and bill_type == "R":
                    bill_type_lower = "house-bill"
                elif chamber_abbrev == "S" and bill_type == "R":
                    bill_type_lower = "senate-bill"
                elif chamber_abbrev == "H" and bill_type.startswith("RES"):
                    bill_type_lower = "house-resolution"
                elif chamber_abbrev == "S" and bill_type.startswith("RES"):
                    bill_type_lower = "senate-resolution"
                elif chamber_abbrev == "H" and bill_type == "J":
                    bill_type_lower = "house-joint-resolution"
                elif chamber_abbrev == "S" and bill_type == "J":
                    bill_type_lower = "senate-joint-resolution"

                if bill_type_lower:
                    congress_gov_url = (
                        f"https://www.congress.gov/bill/{c_int}th-congress/"
                        f"{bill_type_lower}/{int(number)}"
                    )

    vote_id = f"H-{congress}-{session}-{rollcall}" if congress and session and rollcall else None

    iso_datetime = None
    if action_date:
        try:
            if action_time:
                iso_datetime = f"{action_date}T{action_time}"
            else:
                iso_datetime = f"{action_date}T00:00:00"
        except Exception:
            iso_datetime = action_date

    return {
        "id": vote_id,
        "chamber": "house",
        "congress": int(congress) if congress and congress.isdigit() else None,
        "session": session,
        "rollNumber": int(rollcall) if rollcall and rollcall.isdigit() else None,
        "date": iso_datetime or action_date,
        "bill": {
            "code": bill_code,
            "legisNumRaw": legis_num,
            "congressGovUrl": congress_gov_url,
        },
        "question": vote_question,
        "description": vote_desc,
        "voteType": vote_type,
        "result": vote_result,
        "totals": totals_by_vote,
        "totalsByParty": by_party,
        "sources": {
            "houseXml": xml_url,
        },
    }


def fetch_house_votes_official(
    from_date: dt.date,
    to_date: dt.date,
    vote_cap: int = 200,
) -> List[Dict[str, Any]]:
    """
    Fetch House roll-call votes between from_date and to_date (inclusive)
    using the Clerk's XML feeds.
    """
    results: List[Dict[str, Any]] = []

    years = range(from_date.year, to_date.year + 1)
    for year in years:
        index_url = HOUSE_INDEX_URL.format(year=year)
        html = _safe_get(index_url)
        if not html:
            print(f"[official_votes] No HTML for index {index_url}, skipping year {year}")
            continue

        # ROLL_*.asp pages (e.g. ROLL_200.asp, ROLL_100.asp)
        range_starts = {int(m) for m in re.findall(r"ROLL_(\d+)\.asp", html)}
        if not range_starts:
            print(f"[official_votes] No ROLL_*.asp links found in {index_url}, using default 1")
            range_starts = {1}

        seen_rolls = set()

        for start in sorted(range_starts, reverse=True):
            roll_url = HOUSE_ROLL_RANGE_URL.format(year=year, start=start)
            roll_html = _safe_get(roll_url)
            if not roll_html:
                print(f"[official_votes] No HTML for roll range {roll_url}, skipping")
                continue

            # SUPER SIMPLE: grab any "rollnumber=###" we see, ignore &year noise.
            # This avoids having to guess how &amp; is encoded.
            matches = re.findall(r"rollnumber=(\d+)", roll_html, flags=re.IGNORECASE)

            if not matches:
                print(f"[official_votes] No rollnumber=... links found in {roll_url}")
                # Uncomment to debug a slice of HTML:
                # print(roll_html[:500])
                continue

            for roll_str in matches:
                roll = int(roll_str)
                if roll in seen_rolls:
                    continue
                seen_rolls.add(roll)

                xml_url = HOUSE_ROLL_XML_URL.format(year=year, roll=roll)
                xml_text = _safe_get(xml_url)
                if not xml_text:
                    print(f"[official_votes] No XML for {xml_url}, skipping roll {roll}")
                    continue

                vote = _parse_house_vote_xml(xml_text, xml_url)
                if not vote:
                    continue

                v_date_str = (vote.get("date") or "").split("T", 1)[0]
                try:
                    v_date = dt.date.fromisoformat(v_date_str)
                except Exception:
                    v_date = None

                if v_date is not None:
                    if v_date < from_date or v_date > to_date:
                        continue

                results.append(vote)
                if len(results) >= vote_cap:
                    print(f"[official_votes] Reached vote_cap={vote_cap}, stopping House fetch")
                    return sorted(
                        results,
                        key=lambda v: (v.get("date") or "", v.get("rollNumber") or 0),
                        reverse=True,
                    )

    print(f"[official_votes] Finished House fetch with {len(results)} votes")
    return sorted(
        results,
        key=lambda v: (v.get("date") or "", v.get("rollNumber") or 0),
        reverse=True,
    )


def fetch_senate_votes_official(
    from_date: dt.date,
    to_date: dt.date,
    vote_cap: int = 200,
) -> List[Dict[str, Any]]:
    """
    Placeholder: Senate LIS XML support.

    For now this returns an empty list so we don't break anything.
    Later we can wire it to the vote_menu_{congress}_{session}.xml feeds.
    """
    print("[official_votes] Senate fetch stubbed out (returns []) for now.")
    return []
