#!/usr/bin/env python
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MASTER_STATE = DATA_DIR / "master_state.json"
WEB_DIR = DATA_DIR / "web"
WEB_DIR.mkdir(exist_ok=True)

"""
Usage:

    python build_bill_web.py hr1808-117-rc410

This will write:
    data/web/hr1808-117-rc410.json
"""

# --------- helpers ---------

def load_master_state():
    with MASTER_STATE.open("r", encoding="utf-8") as f:
        return json.load(f)


def make_node(id_, type_, label, url=None, meta=None):
    return {
        "id": id_,
        "type": type_,
        "label": label,
        **({"url": url} if url else {}),
        **({"meta": meta} if meta else {})
    }


def make_link(source, target, kind, meta=None):
    out = {"source": source, "target": target, "kind": kind}
    if meta:
        out["meta"] = meta
    return out


# --------- domain-specific extraction (adjust to your schema) ---------

def get_bill(state, bill_key):
    """
    bill_key example: 'hr1808-117'
    Adjust this to your master_state schema.
    """
    # TODO: adapt this to your actual structure
    # Example assumption:
    # state["bills"] is a dict keyed by bill_id like "hr1808-117"
    bills = state.get("bills", {})
    bill = bills.get(bill_key)
    if not bill:
        raise SystemExit(f"Bill {bill_key!r} not found in master_state")
    return bill


def get_vote(state, vote_key):
    """
    vote_key example: 'house-117-rc410'
    """
    # TODO: adapt to your structure
    votes = state.get("votes", {})
    vote = votes.get(vote_key)
    if not vote:
        raise SystemExit(f"Vote {vote_key!r} not found in master_state")
    return vote


def get_member(state, bioguide):
    # TODO: adapt to your members index
    # Example: state["members"][bioguide]
    members = state.get("members", {})
    return members.get(bioguide)


# --------- core graph builder ---------

def build_graph_for_bill(state, graph_id, bill_id, vote_id=None):
    """
    graph_id: file id, e.g. 'hr1808-117-rc410'
    bill_id:  master_state bill key, e.g. 'hr1808-117'
    vote_id:  master_state vote key, e.g. 'house-117-rc410'
    """

    bill = get_bill(state, bill_id)

    congress = bill.get("congress")
    chamber = bill.get("chamber")  # 'house' or 'senate'
    number = bill.get("number")
    title = bill.get("title_short") or bill.get("title") or bill_id.upper()

    congress_gov_url = bill.get("urls", {}).get("congress_gov")
    summary_url = bill.get("urls", {}).get("summary")

    policy_area = bill.get("policy_area") or "Uncategorized"
    topics = bill.get("topics", [])  # e.g. ['Gun control', 'Public safety']

    nodes = []
    links = []

    # --- bill node ---
    bill_node_id = f"bill-{bill_id}"
    nodes.append(
        make_node(
            bill_node_id,
            "bill",
            f"{bill.get('code', bill_id).upper()} — {title}",
            url=congress_gov_url,
            meta={
                "congress": congress,
                "chamber": chamber,
                "status": bill.get("status"),
                "policyArea": policy_area,
            },
        )
    )

    # --- vote node (if any) ---
    vote_node_id = None
    if vote_id:
        vote = get_vote(state, vote_id)
        vote_node_id = f"vote-{vote_id}"
        nodes.append(
            make_node(
                vote_node_id,
                "vote",
                vote.get("label")
                or f"{chamber.title()} Roll Call {vote.get('roll')}",
                url=vote.get("url"),
                meta={
                    "date": vote.get("date"),
                    "question": vote.get("question"),
                    "result": vote.get("result"),
                    "yea": vote.get("yea"),
                    "nay": vote.get("nay"),
                    "present": vote.get("present"),
                    "notVoting": vote.get("not_voting"),
                },
            )
        )
        links.append(make_link(bill_node_id, vote_node_id, "has-vote"))

    # --- sponsor & key members ---
    # TODO: wire this to your actual member references.
    # Here I assume bill["sponsor"] has a bioguide + label and
    # bill["cosponsors"] is a small list of bioguides we care about.

    sponsor = bill.get("sponsor")
    if sponsor:
        s_id = sponsor.get("bioguide") or sponsor.get("id") or "sponsor"
        mem_node_id = f"member-{s_id}"
        nodes.append(
            make_node(
                mem_node_id,
                "member",
                sponsor.get("label") or sponsor.get("name"),
                meta={
                    "party": sponsor.get("party"),
                    "state": sponsor.get("state"),
                    "role": "Sponsor",
                },
            )
        )
        links.append(make_link(bill_node_id, mem_node_id, "sponsor"))

    # Optional: a few featured yes/no votes from each party
    featured_votes = bill.get("featured_votes", [])
    for fv in featured_votes:
        bioguide = fv["bioguide"]
        mem_node_id = f"member-{bioguide}"
        label = fv.get("label") or fv.get("name") or bioguide
        if not any(n["id"] == mem_node_id for n in nodes):
            nodes.append(
                make_node(
                    mem_node_id,
                    "member",
                    label,
                    meta={
                        "party": fv.get("party"),
                        "state": fv.get("state"),
                    },
                )
            )
        if vote_node_id:
            links.append(
                make_link(
                    vote_node_id,
                    mem_node_id,
                    fv.get("vote", "").lower() or "vote",
                )
            )

    # --- parties (one node per party) ---
    # This can be summary-level: total yeas/nays by party.

    party_totals = bill.get("party_totals", {})
    party_nodes = {}
    for code, meta in party_totals.items():
        pid = f"party-{code.lower()}"
        party_nodes[code] = pid
        label = {"D": "Democratic Party", "R": "Republican Party"}.get(
            code, f"{code} Party"
        )
        nodes.append(make_node(pid, "party", label, meta=meta))

    # link members -> party nodes
    for n in list(nodes):
        if n["type"] == "member":
            party = (n.get("meta") or {}).get("party")
            if not party:
                continue
            pid = party_nodes.get(party)
            if pid:
                links.append(make_link(n["id"], pid, "member-of"))

    # --- topics / policy area ---
    topic_nodes = {}

    if policy_area:
        tid = "topic-policy-area"
        topic_nodes[policy_area] = tid
        nodes.append(make_node(tid, "topic", policy_area))
        links.append(make_link(bill_node_id, tid, "policy-area"))

    for t in topics:
        if t in topic_nodes:
            continue
        tid = f"topic-{len(topic_nodes)+1}"
        topic_nodes[t] = tid
        nodes.append(make_node(tid, "topic", t))
        links.append(make_link(bill_node_id, tid, "subject"))

    # --- sources ---
    src_nodes = []

    if congress_gov_url:
        src_nodes.append(
            make_node(
                "src-congress-gov-bill",
                "source",
                "Congress.gov — Bill page",
                url=congress_gov_url,
            )
        )
        links.append(
            make_link(bill_node_id, "src-congress-gov-bill", "official-source")
        )

    if summary_url:
        src_nodes.append(
            make_node(
                "src-congress-gov-summary",
                "source",
                "Congress.gov — Bill summary",
                url=summary_url,
            )
        )
        links.append(
            make_link(bill_node_id, "src-congress-gov-summary", "official-source")
        )

    # any optional external sources you pre-resolve into master_state
    for src in bill.get("extra_sources", []):
        sid = src["id"]
        src_nodes.append(
            make_node(sid, "source", src["label"], url=src.get("url"))
        )
        links.append(make_link(bill_node_id, sid, src.get("kind", "context-source")))

    nodes.extend(src_nodes)

    graph = {
        "id": graph_id,
        "label": f"{bill.get('code', bill_id).upper()} — {title}",
        "nodes": nodes,
        "links": links,
    }
    return graph


def main(argv=None):
    argv = argv or sys.argv[1:]
    if not argv:
        print("Usage: python build_bill_web.py hr1808-117-rc410", file=sys.stderr)
        raise SystemExit(1)

    graph_id = argv[0]

    # naive parsing: hr1808-117-rc410 → bill=hr1808-117, vote=house-117-rc410
    parts = graph_id.split("-")
    if len(parts) < 3:
        raise SystemExit("graph_id should look like hr1808-117-rc410")

    bill_id = "-".join(parts[0:2])        # hr1808-117
    roll = parts[2]                       # rc410
    vote_id = f"house-{parts[1]}-{roll}"  # house-117-rc410  (adjust if needed)

    state = load_master_state()
    graph = build_graph_for_bill(state, graph_id, bill_id, vote_id=vote_id)

    out_path = WEB_DIR / f"{graph_id}.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, sort_keys=False)

    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
