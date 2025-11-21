from flask import Flask, request, jsonify, abort, send_from_directory
from pathlib import Path
import json

from build_bill_web import DATA_DIR, WEB_DIR  # WEB_DIR points to data/web

ROOT = Path(__file__).resolve().parent

# Serve your HTML/JS/CSS directly from the repo folder
app = Flask(__name__, static_folder=str(ROOT), static_url_path="")

# --- helper: find an existing graph file in data/web ------------------------

def find_graph_file(chamber: str, roll: str) -> Path | None:
    """
    Matches the files you already have, e.g.:

        data/web/H-119-1st-293.json
        data/web/S-119-1st-42.json

    For chamber=house, roll=293 -> look for H-*-293.json
    For chamber=senate, roll=10 -> look for S-*-10.json
    """
    chamber = (chamber or "").lower().strip()
    roll = str(roll).strip()

    if not roll:
        return None

    if chamber == "house":
        prefix = "H-"
    elif chamber == "senate":
        prefix = "S-"
    else:
        return None

    pattern = f"{prefix}*-{roll}.json"
    candidates = sorted(WEB_DIR.glob(pattern))
    return candidates[0] if candidates else None


# --- THIS IS YOUR "API" (no folder needed) ----------------------------------

@app.get("/api/bill-web")
def api_bill_web():
    # votes.html / issue-web.js send these query params:
    #   /api/bill-web?bill=H.Res.+878&chamber=house&roll=293
    bill = (request.args.get("bill") or "").strip()      # not used yet, but we grab it
    chamber = (request.args.get("chamber") or "").strip()
    roll = (request.args.get("roll") or "").strip()

    if not chamber or not roll:
        abort(400, "Missing chamber or roll")

    path = find_graph_file(chamber, roll)
    if not path:
        # No JSON built yet for this vote -> front end shows
        # "Issue web is still building from public sources. Check back soon."
        abort(404, "Issue web is still building from public sources. Check back soon.")

    try:
        with path.open("r", encoding="utf-8") as f:
            graph = json.load(f)
    except json.JSONDecodeError:
        abort(500, "Issue web JSON is invalid")

    return jsonify(graph)


# Optional: hitting http://127.0.0.1:5000/ goes straight to votes.html
@app.get("/")
def index():
    return send_from_directory(ROOT, "votes.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
