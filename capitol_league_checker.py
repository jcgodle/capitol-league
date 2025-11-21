#!/usr/bin/env python3
"""
Capitol League Checker

Read-only checks. Does NOT modify any project files.

Checks:
- Header system (JS-injected header via #site-header + shared.js)
- House votes wiring
- Senate votes wiring
- Cards page wiring
- Cards populated with vote-related data (from data/*.json)
"""

from pathlib import Path
from typing import Tuple, List
import json

PROJECT_ROOT = Path(__file__).parent

HTML_FILES_TO_CHECK = [
    "index.html",
    "votes.html",
    "cards.html",
    "draft.html",
    "rules.html",
]

SHARED_JS = PROJECT_ROOT / "shared.js"
SHARED_CSS = PROJECT_ROOT / "shared.css"

VOTES_JS = PROJECT_ROOT / "votes.js"
VOTES_SOURCES_JS = PROJECT_ROOT / "votes_sources.js"

CARDS_HTML = PROJECT_ROOT / "cards.html"
CARDS_JS_CANDIDATES = [
    PROJECT_ROOT / "js" / "cards-kpi-feed-only.js",
    PROJECT_ROOT / "cards-kpi-feed-only.js",
]
CARDS_JS_REQUIRED_STRINGS = [
    "loadAllKPIs",
    "async",
]

DATA_DIR = PROJECT_ROOT / "data"


def status_line(name: str, ok: bool, detail: str = "") -> None:
    icon = "🟩" if ok else "🟥"
    msg = f"{icon} {name}: {'OK' if ok else 'FAIL'}"
    if detail:
        msg += f" — {detail}"
    print(msg)


# ---------------------- HEADER SYSTEM ----------------------------------------


def check_header_on_page(html_path: Path) -> Tuple[bool, str]:
    if not html_path.exists():
        return False, "file missing"

    content = html_path.read_text(encoding="utf-8").lower()

    has_site_header = ('id="site-header"' in content) or ("id='site-header'" in content)
    if not has_site_header:
        return False, 'missing <div id="site-header"> (header host)'

    if "shared.js" not in content:
        return False, 'missing reference to shared.js (header injector)'

    return True, ""


def check_header_system() -> bool:
    print("Checking header system (JS-injected)...")
    all_ok = True

    if not SHARED_JS.exists():
        status_line("Header Core (shared.js)", False, "shared.js file missing")
        all_ok = False
    else:
        js_content = SHARED_JS.read_text(encoding="utf-8").lower()
        if "site-header" not in js_content or "innerhtml" not in js_content:
            status_line(
                "Header Core (shared.js)",
                False,
                "shared.js present but no obvious #site-header injection; verify manually",
            )
            all_ok = False
        else:
            status_line("Header Core (shared.js)", True, "header injector found")

    if not SHARED_CSS.exists():
        status_line("Header Styles (shared.css)", False, "shared.css file missing")
        all_ok = False
    else:
        status_line("Header Styles (shared.css)", True, "")

    for fname in HTML_FILES_TO_CHECK:
        page = PROJECT_ROOT / fname
        ok, detail = check_header_on_page(page)
        status_line(f"Header ({fname})", ok, detail)
        if not ok:
            all_ok = False

    if all_ok:
        print("➡ Header System: OK\n")
    else:
        print("➡ Header System: FAIL (see lines above)\n")

    return all_ok


# ---------------------- VOTES WIRING -----------------------------------------


def load_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").lower()


def check_votes_wiring() -> Tuple[bool, bool, List[str]]:
    problems: List[str] = []
    house_ok = False
    senate_ok = False

    vjs_exists = VOTES_JS.exists()
    vsrc_exists = VOTES_SOURCES_JS.exists()

    if not vjs_exists:
        problems.append("votes.js file missing")
    if not vsrc_exists:
        problems.append("votes_sources.js file missing")

    if not vjs_exists or not vsrc_exists:
        return house_ok, senate_ok, problems

    vjs = load_text(VOTES_JS)
    vsrc = load_text(VOTES_SOURCES_JS)
    combined = vjs + "\n" + vsrc

    # House
    house_tokens = [
        "fetchhousevotes",
        "loadhousevotes",
        "house_votes",
        "housevotes",
    ]
    has_house_token = any(tok in combined for tok in house_tokens)
    has_house_chamber = ("'house'" in combined) or ('"house"' in combined)

    if has_house_token and has_house_chamber:
        house_ok = True
    else:
        problems.append(
            "House wiring not clearly found (expected a House function + 'house' chamber string)"
        )

    # Senate
    senate_tokens = [
        "fetchsenatevotes",
        "loadsenatevotes",
        "senate_votes",
        "senatevotes",
    ]
    has_senate_token = any(tok in combined for tok in senate_tokens)
    has_senate_chamber = ("'senate'" in combined) or ('\"senate\"' in combined)

    if has_senate_token and has_senate_chamber:
        senate_ok = True
    else:
        problems.append(
            "Senate wiring not clearly found (expected a Senate function + 'senate' chamber string)"
        )

    return house_ok, senate_ok, problems


# ---------------------- CARDS PAGE -------------------------------------------


def locate_cards_js():
    for path in CARDS_JS_CANDIDATES:
        if path.exists():
            return path
    return None


def check_cards_page() -> Tuple[bool, List[str]]:
    problems: List[str] = []

    if not CARDS_HTML.exists():
        problems.append("cards.html file missing")
        return False, problems

    html_content = CARDS_HTML.read_text(encoding="utf-8").lower()
    js_path = locate_cards_js()

    if js_path is None:
        problems.append(
            "cards JS loader missing (expected js/cards-kpi-feed-only.js or cards-kpi-feed-only.js)"
        )
        return False, problems

    js_name = js_path.name.lower()
    if js_name not in html_content:
        problems.append(
            f"cards.html does not reference {js_name} (loader not wired into page)"
        )

    js_content = js_path.read_text(encoding="utf-8")

    for token in CARDS_JS_REQUIRED_STRINGS:
        if token not in js_content:
            problems.append(f'missing "{token}" in {js_name} (cards loader may be broken)')

    ok = len(problems) == 0
    return ok, problems


# ---------------------- CARDS POPULATION (VOTE DATA) -------------------------


def scan_vote_jsons() -> Tuple[bool, List[str]]:
    """
    Look through data/*.json for any non-empty fields whose key contains 'vote'.
    This is a heuristic to tell if card-related data actually has vote info.
    """
    problems: List[str] = []
    hits: List[str] = []

    if not DATA_DIR.exists():
        problems.append("data/ folder missing")
        return False, problems

    json_files = list(DATA_DIR.glob("*.json"))
    if not json_files:
        problems.append("no JSON files found in data/")
        return False, problems

    def walk(node, path_name: str):
        if isinstance(node, dict):
            for k, v in node.items():
                key_lower = str(k).lower()
                if "vote" in key_lower:
                    if isinstance(v, (int, float)) and v != 0:
                        hits.append(path_name)
                    elif isinstance(v, (list, dict)) and len(v) > 0:
                        hits.append(path_name)
                    elif isinstance(v, str):
                        val = v.strip()
                        if val and val.lower() not in ("placeholder", "todo", "tbd"):
                            hits.append(path_name)
                walk(v, path_name)
        elif isinstance(node, list):
            for item in node:
                walk(item, path_name)

    for path in json_files:
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            problems.append(f"{path.name}: JSON parse error ({e})")
            continue
        walk(data, path.name)

    if hits:
        unique_hits = sorted(set(hits))
        problems.append("vote-like fields with data found in: " + ", ".join(unique_hits))
        return True, problems
    else:
        problems.append("no non-empty 'vote*' fields found in any data/*.json file")
        return False, problems


# ---------------------- MAIN -------------------------------------------------


def run_checks_once() -> None:
    print("\n====================")
    print(" Capitol League Checker")
    print("====================\n")

    header_ok = check_header_system()

    print("Checking votes wiring (House / Senate)...")
    house_ok, senate_ok, vote_problems = check_votes_wiring()
    status_line(
        "House Votes Wiring",
        house_ok,
        "" if house_ok else "House not clearly wired in votes.js / votes_sources.js",
    )
    status_line(
        "Senate Votes Wiring",
        senate_ok,
        "" if senate_ok else "Senate not clearly wired in votes.js / votes_sources.js",
    )
    if vote_problems:
        print("   Details:", "; ".join(vote_problems))
    print()

    print("Checking cards page wiring...")
    cards_ok, cards_problems = check_cards_page()
    status_line("Cards Page", cards_ok, "" if cards_ok else "cards HTML / JS wiring issue")
    if cards_problems:
        print("   Details:", "; ".join(cards_problems))
    print()

    print("Checking cards population (vote-related data)...")
    cards_data_ok, cards_data_problems = scan_vote_jsons()
    status_line(
        "Cards Populated (vote data)",
        cards_data_ok,
        "" if cards_data_ok else "no clear vote-related data in data/*.json",
    )
    if cards_data_problems:
        print("   Details:", "; ".join(cards_data_problems))
    print()

    all_ok = header_ok and house_ok and senate_ok and cards_ok and cards_data_ok
    print("====== SUMMARY ======")
    summary_icon = "🟩" if all_ok else "🟥"
    print(f"{summary_icon} Overall status: {'OK' if all_ok else 'Issues detected'}")
    print()


if __name__ == "__main__":
    run_checks_once()
