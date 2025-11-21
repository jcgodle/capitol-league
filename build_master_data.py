#!/usr/bin/env python3
"""
build_master_data.py

Aggregates vote and league data into data/master_state.json.

Updated (2025-11):
- Uses OFFICIAL XML sources for roll-call votes:
    * House: clerk.house.gov XML
    * Senate: senate.gov LIS XML (stubbed for now, shape is ready)
- Falls back to GovTrack if the official source fails or returns nothing.
- NO LONGER depends on the Congress.gov votes API (it has been flaky/404).

It also attaches simple source metadata and domain trust ranks so that later
we can mix data from multiple sources (.gov > .edu > .org > everything else).
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

# NEW: official votes helpers (House/Senate XML)
from official_votes import fetch_house_votes_official, fetch_senate_votes_official


# --------------------------
# Paths / constants
# --------------------------

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
MASTER_STATE_PATH = DATA_DIR / "master_state.json"

GOVTRACK_BASE = "https://www.govtrack.us/api/v2"

DEFAULT_LOOKBACK_DAYS = 7
VOTE_CAP_PER_CHAMBER = 200  # hard cap so we don't hammer APIs

HISTORICAL_START = date(2023, 1, 1)


# --------------------------
# Utilities
# --------------------------

def utc_now_iso() -> str:
    """Return current UTC timestamp as ISO string."""
    # Using naive UTC timestamp so we don't depend on timezone objects.
    return datetime.utcnow().isoformat()


def rank_source_domain(url: str) -> int:
    """
    Very small trust scoring function.

    We only care about the high-level TLD:
        .gov   -> 100
        .edu   -> 80
        .org   -> 60
        other  -> 40
    """
    from urllib.parse import urlparse

    try:
        netloc = urlparse(url).hostname or ""
    except Exception:
        return 0

    netloc = netloc.lower()
    if netloc.endswith(".gov"):
        return 100
    if netloc.endswith(".edu"):
        return 80
    if netloc.endswith(".org"):
        return 60
    if netloc:
        return 40
    return 0


def load_existing_state() -> Dict[str, Any]:
    """Load master_state.json if it exists, otherwise return a basic skeleton."""
    if MASTER_STATE_PATH.exists():
        try:
            with MASTER_STATE_PATH.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            # If it's corrupt, fall back to skeleton but don't blow up the run.
            pass

    # Minimal skeleton; league/cards can be filled elsewhere.
    return {
        "generatedAt": utc_now_iso(),
        "params": {
            "lookbackDays": DEFAULT_LOOKBACK_DAYS,
            "voteCapPerChamber": VOTE_CAP_PER_CHAMBER,
        },
        "votes": {
            "house": {"fromDate": None, "toDate": None, "count": 0, "votes": []},
            "senate": {"fromDate": None, "toDate": None, "count": 0, "votes": []},
        },
        "sourceMeta": {},
        "league": {},
        "cards": {},
    }


def save_state(state: Dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = MASTER_STATE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, sort_keys=False)
    tmp.replace(MASTER_STATE_PATH)


def parse_args(argv: List[str]) -> Tuple[str, Optional[date], Optional[date]]:
    """
    Returns (mode, from_date, to_date).

    Modes:
      - "live"   : python build_master_data.py
      - "full"   : python build_master_data.py full
      - "update" : python build_master_data.py update
    """
    today = date.today()

    if len(argv) <= 1:
        # LIVE: rolling window
        to_d = today
        from_d = to_d - timedelta(days=DEFAULT_LOOKBACK_DAYS)
        return "live", from_d, to_d

    mode = argv[1].lower()
    if mode == "full":
        # Historical since 2023-01-01 through today
        return "full", HISTORICAL_START, today
    if mode == "update":
        # Update from last stored date (or lookback) through today
        st = load_existing_state()
        last_house_to = st.get("votes", {}).get("house", {}).get("toDate")
        last_senate_to = st.get("votes", {}).get("senate", {}).get("toDate")

        def parse_iso(d: Any) -> Optional[date]:
            try:
                return datetime.fromisoformat(str(d)).date()
            except Exception:
                try:
                    return datetime.strptime(str(d), "%Y-%m-%d").date()
                except Exception:
                    return None

        last_dates = [parse_iso(last_house_to), parse_iso(last_senate_to)]
        last_dates = [d for d in last_dates if d is not None]

        if last_dates:
            start_from = min(last_dates) - timedelta(days=2)
        else:
            start_from = today - timedelta(days=DEFAULT_LOOKBACK_DAYS)

        return "update", start_from, today

    # Fallback: treat as live
    to_d = today
    from_d = to_d - timedelta(days=DEFAULT_LOOKBACK_DAYS)
    return "live", from_d, to_d


# --------------------------
# Source trackers
# --------------------------

@dataclass
class SourceStatus:
    name: str
    domain: str
    url: str
    priority: int
    lastAttempt: Optional[str] = None
    lastStatus: Optional[str] = None
    lastSuccess: Optional[str] = None

    def mark_attempt(self, status: str, success: bool) -> None:
        self.lastAttempt = utc_now_iso()
        self.lastStatus = status
        if success:
            self.lastSuccess = self.lastAttempt


def ensure_source_meta(state: Dict[str, Any]) -> Dict[str, Any]:
    meta = state.setdefault("sourceMeta", {})
    votes_meta = meta.setdefault("votes", {})
    return votes_meta


# --------------------------
# GovTrack fetcher (fallback)
# --------------------------

def fetch_govtrack_votes(
    chamber: str, from_date: date, to_date: date, cap: int
) -> List[Dict[str, Any]]:
    """
    Fetch recent votes from GovTrack.

    GovTrack's API does not require a key. We ask for votes in the given
    chamber ordered by -created and then trim to the requested date window.
    """
    url = f"{GOVTRACK_BASE}/vote"
    params = {
        "chamber": chamber,
        "order_by": "-created",
        "limit": cap,
    }

    resp = requests.get(url, params=params, timeout=20)
    if resp.status_code != 200:
        raise RuntimeError(
            f"GovTrack votes failed: {resp.status_code} {resp.text[:200]}"
        )

    data = resp.json()
    objects = data.get("objects") or data.get("results") or []

    normalized: List[Dict[str, Any]] = []
    for obj in objects:
        # created is an ISO timestamp like "2025-11-12T17:42:00"
        created = obj.get("created") or obj.get("voted_at")
        created_date: Optional[date] = None
        if created:
            try:
                created_date = datetime.fromisoformat(created.replace("Z", "")).date()
            except Exception:
                created_date = None

        # Respect date window if we parsed it
        if created_date is not None:
            if created_date < from_date or created_date > to_date:
                continue

        desc = obj.get("description") or obj.get("question")
        result = obj.get("result") or obj.get("vote_type")

        source_url = obj.get("link") or obj.get("url") or "https://www.govtrack.us/"

        vote = {
            "id": obj.get("id"),
            "chamber": obj.get("chamber") or chamber,
            "source": "govtrack.us",
            "sourceUrl": source_url,
            "description": desc,
            "question": obj.get("question"),
            "result": result,
            "created": created,
            "raw": obj,
            "sources": [
                {
                    "domain": "govtrack.us",
                    "url": source_url,
                    "rank": rank_source_domain(source_url),
                }
            ],
        }
        normalized.append(vote)

    # Sort newest->oldest by created timestamp for determinism
    normalized.sort(key=lambda v: v.get("created") or "", reverse=True)
    return normalized[:cap]


# --------------------------
# Aggregation logic
# --------------------------

def merge_votes(
    existing: List[Dict[str, Any]],
    new_votes: List[Dict[str, Any]],
    max_count: int,
) -> List[Dict[str, Any]]:
    """
    Merge existing + new votes, de-duplicating by 'id' and trimming to max_count.
    """
    by_id: Dict[Any, Dict[str, Any]] = {}

    for v in existing:
        vid = v.get("id")
        if vid is None:
            continue
        by_id[vid] = v

    for v in new_votes:
        vid = v.get("id")
        if vid is None:
            continue
        # New wins over old
        by_id[vid] = v

    merged = list(by_id.values())
    merged.sort(key=lambda v: v.get("created") or v.get("date") or "", reverse=True)
    return merged[:max_count]


def update_votes_for_chamber(
    state: Dict[str, Any],
    chamber: str,
    from_date: date,
    to_date: date,
    mode: str,
) -> None:
    """
    Update votes for a single chamber with multi-source logic.

    Order of attempts:
      1. Official XML (Clerk for House, Senate LIS for Senate)
      2. GovTrack fallback
      3. If all fail -> preserve existing data in state
    """
    votes_section = state.setdefault("votes", {}).setdefault(
        chamber, {"fromDate": None, "toDate": None, "count": 0, "votes": []}
    )
    existing_votes: List[Dict[str, Any]] = votes_section.get("votes") or []

    meta = ensure_source_meta(state)

    if chamber == "house":
        official_status_key = "house.clerk"
        official_source = SourceStatus(
            name="Clerk of the House (XML)",
            domain="clerk.house.gov",
            url="https://clerk.house.gov/evs/",
            priority=120,
        )
    else:
        official_status_key = "senate.lis"
        official_source = SourceStatus(
            name="Senate LIS (XML)",
            domain="senate.gov",
            url="https://www.senate.gov/legislative/",
            priority=120,
        )

    govtrack_status_key = f"govtrack.{chamber}"
    govtrack_source = SourceStatus(
        name=f"GovTrack.us ({chamber})",
        domain="govtrack.us",
        url=f"{GOVTRACK_BASE}/vote",
        priority=60,
    )

    official_status = meta.setdefault(official_status_key, asdict(official_source))
    govtrack_status = meta.setdefault(govtrack_status_key, asdict(govtrack_source))

    # Helper to update SourceStatus dicts in-place
    def mark_status(d: Dict[str, Any], status: str, success: bool) -> None:
        ss = SourceStatus(**d)
        ss.mark_attempt(status=status, success=success)
        d.clear()
        d.update(asdict(ss))

    new_votes: List[Dict[str, Any]] = []
    any_success = False

    # 1) Official XML
    try:
        print(f"Fetching {chamber} votes from official XML source...")
        if chamber == "house":
            off_votes = fetch_house_votes_official(from_date, to_date, VOTE_CAP_PER_CHAMBER)
        else:
            off_votes = fetch_senate_votes_official(from_date, to_date, VOTE_CAP_PER_CHAMBER)

        if off_votes:
            any_success = True
        mark_status(official_status, "ok", bool(off_votes))
        new_votes.extend(off_votes)
    except Exception as exc:
        msg = f"error: {exc}"
        print(f"[{chamber}] Official XML fetch failed: {msg}")
        mark_status(official_status, msg[:120], False)

    # 2) GovTrack fallback
    try:
        print(f"Fetching {chamber} votes from GovTrack (fallback)...")
        gt_votes = fetch_govtrack_votes(chamber, from_date, to_date, VOTE_CAP_PER_CHAMBER)
        if gt_votes:
            any_success = True
        mark_status(govtrack_status, "ok", bool(gt_votes))
        new_votes.extend(gt_votes)
    except Exception as exc:
        msg = f"error: {exc}"
        print(f"[{chamber}] GovTrack fetch failed: {msg}")
        mark_status(govtrack_status, msg[:120], False)

    if not any_success:
        # Preserve existing data and just bump dates so the front-end
        # knows the snapshot window we *tried* to refresh.
        print(
            f"WARNING: All vote sources failed for {chamber}; "
            "preserving existing votes."
        )
        votes_section["fromDate"] = from_date.isoformat()
        votes_section["toDate"] = to_date.isoformat()
        votes_section["count"] = len(existing_votes)
        votes_section["votes"] = existing_votes
        return

    merged = merge_votes(existing_votes, new_votes, VOTE_CAP_PER_CHAMBER)
    votes_section["fromDate"] = from_date.isoformat()
    votes_section["toDate"] = to_date.isoformat()
    votes_section["count"] = len(merged)
    votes_section["votes"] = merged


# --------------------------
# Entry point
# --------------------------

def main(argv: List[str]) -> int:
    mode, from_date, to_date = parse_args(argv)
    assert from_date is not None and to_date is not None

    print(
        f"Running build_master_data in {mode.upper()} mode "
        f"for {from_date.isoformat()} -> {to_date.isoformat()}"
    )
    print("Primary sources: Clerk (House XML), Senate LIS (XML)")
    print(f"Fallback: GovTrack ({GOVTRACK_BASE}/vote)")

    state = load_existing_state()
    state["generatedAt"] = utc_now_iso()
    state.setdefault("params", {})["lookbackDays"] = (to_date - from_date).days
    state["params"]["voteCapPerChamber"] = VOTE_CAP_PER_CHAMBER

    # Update both chambers
    for chamber in ("house", "senate"):
        update_votes_for_chamber(state, chamber, from_date, to_date, mode)

    save_state(state)
    print(f"\nMaster state written to {MASTER_STATE_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
