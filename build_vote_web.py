#!/usr/bin/env python3
"""
build_vote_web.py

Usage:
    # Build web for a single vote id:
    python build_vote_web.py H-119-1st-262

    # Build webs for ALL votes in master_state.json:
    python build_vote_web.py ALL

Reads data/master_state.json, finds vote(s), and writes graph/spiderweb
JSON files to data/web/<voteId>.json that the front-end can later use to
render a node-link view.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MASTER_STATE_PATH = DATA_DIR / "master_state.json"
WEB_DIR = DATA_DIR / "web"


def load_state():
    if not MASTER_STATE_PATH.exists():
        print(f"ERROR: {MASTER_STATE_PATH} does not exist.")
        sys.exit(1)
    with MASTER_STATE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_all_votes(state):
    votes_root = state.get("votes", {})
    house_votes = votes_root.get("house", {}).get("votes", [])
    senate_votes = votes_root.get("senate", {}).get("votes", [])
    return house_votes + senate_votes


def find_vote(state, vote_id):
    for v in get_all_votes(state):
        if v.get("id") == vote_id:
            return v
    return None


def build_graph(vote):
    """
    Build a simple node-link graph for a single vote.
    Center node = the vote/bill, with spokes for party totals + overall totals.
    """
    center_id = vote.get("id")
    bill = vote.get("bill") or {}
    bill_label = (
        bill.get("code")
        or bill.get("legisNumRaw")
        or "Unknown bill"
    )
    question = vote.get("question") or ""
    description = vote.get("description") or ""
    result = vote.get("result")
    date = vote.get("date")
    sources = vote.get("sources") or {}

    nodes = []
    links = []

    # Center node = the vote itself
    nodes.append({
        "id": center_id,
        "type": "vote",
        "label": bill_label,
        "question": question,
        "description": description,
        "result": result,
        "date": date,
        "sources": sources,
    })

    # Party nodes based on totalsByParty
    for p in vote.get("totalsByParty", []):
        party_name = p.get("party", "Unknown")
        nid = f"party:{party_name}"
        nodes.append({
            "id": nid,
            "type": "party",
            "label": party_name,
            "totals": {
                "yea": p.get("yea", 0),
                "nay": p.get("nay", 0),
                "present": p.get("present", 0),
                "notVoting": p.get("notVoting", 0),
            },
        })
        links.append({
            "from": center_id,
            "to": nid,
            "kind": "partyTotals",
        })

    # Overall totals node
    totals = vote.get("totals")
    if totals:
        totals_id = f"{center_id}:totals"
        nodes.append({
            "id": totals_id,
            "type": "totals",
            "label": "Overall vote totals",
            "totals": {
                "yea": totals.get("yea", 0),
                "nay": totals.get("nay", 0),
                "present": totals.get("present", 0),
                "notVoting": totals.get("notVoting", 0),
            },
        })
        links.append({
            "from": center_id,
            "to": totals_id,
            "kind": "overallTotals",
        })

    graph = {
        "id": center_id,
        "label": f"{bill_label} — {question}",
        "center": center_id,
        "nodes": nodes,
        "links": links,
    }

    return graph


def write_graph(vote):
    vote_id = vote.get("id")
    if not vote_id:
        print("Skipping vote with no id:", vote)
        return

    graph = build_graph(vote)

    WEB_DIR.mkdir(parents=True, exist_ok=True)
    out_path = WEB_DIR / f"{vote_id}.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2)

    print(f"Wrote {out_path}")


def main(argv):
    if len(argv) < 2:
        print("Usage:")
        print("  python build_vote_web.py <vote-id>")
        print("  python build_vote_web.py ALL")
        sys.exit(1)

    arg = argv[1]
    state = load_state()

    if arg.upper() == "ALL":
        votes = get_all_votes(state)
        if not votes:
            print("No votes found in master_state.json")
            sys.exit(1)
        print(f"Building webs for {len(votes)} votes...")
        for v in votes:
            write_graph(v)
        print("Done.")
        return

    # Single vote mode
    vote_id = arg
    vote = find_vote(state, vote_id)
    if not vote:
        print(f"ERROR: vote id {vote_id!r} not found in master_state.json")
        sys.exit(1)

    write_graph(vote)


if __name__ == "__main__":
    main(sys.argv)
