# Architecture

## Current `main`

The repo was cleaned on 2026-10-04 so `main` contains only the current reviewable prototype and supporting data/tooling.

Historical variants remain on archive branches.

## Frontend

Static multi-page prototype:

- `index.html` — Scoreboard/home
- `draft.html` — roster drafting
- `cards.html` — legislator cards
- `votes.html` — vote exploration
- `rules.html` — rules surface
- `sources.html` — data/source references

Shared browser assets:

- `assets/css/shared.css`
- `assets/js/shared.js`
- `assets/js/draft.js`
- `assets/js/cards-kpi-feed-only.js`

`vite.config.js` builds all six HTML entry points.

## Runtime data

`public/data/` is the one canonical runtime-data location.

Vite serves it as `/data/` during development and copies it into `dist/data/` for production builds.

Important files:

- `public/data/master_state.json`
- `public/data/roster.json`
- `public/data/myteam_ids.json`
- `public/data/kpis.csv`
- `public/data/kpis.json`
- `public/data/web/` — recovered vote/bill JSON snapshots

Do not create duplicate KPI locations elsewhere in the repo.

## KPI pipeline

`scripts/capitol_league_rollcall_aggregate.py`

Collects official House/Senate roll-call participation.

`scripts/build_kpis.py`

Maps Bioguide IDs to GovTrack IDs and writes:

- `public/data/kpis.csv`
- `public/data/kpis.json`

`.github/workflows/build-kpis-python.yml`

Runs the KPI refresh on schedule or manual dispatch.

## Optional proxy

`server/house-proxy.js`

Small Express service for normalized recent House roll-call data.

It is useful for development but is not a complete production backend.

## JavaScript / Node

```bash
npm install
npm run dev
npm run build
npm start
```

## Python

```bash
pip install -r requirements.txt
python scripts/build_kpis.py
```

## Known technical debt

- The frontend is still old-style HTML with substantial inline JavaScript.
- The Node dependency tree needs modernization before production use.
- The app has no real account/database layer.
- Congressional event/scoring contracts need to be formalized before expanding features.

## Archive branches

`archive/pre-revival-2026-10-04`

Old GitHub state before revival documentation.

`archive/full-recovery-2026-10-04`

Full recovery state, including disk-only snapshots, alternate Scoreboards, old Cards bridges, issue-web experiments, admin tools, legacy builders, and duplicate implementations.

Use those branches only when archaeology is needed.
