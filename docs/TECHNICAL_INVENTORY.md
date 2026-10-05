# Technical Inventory

**Inventory date:** 2026-10-04

This repo contains two evidence layers:

1. The surviving GitHub working tree.
2. A sanitized disk snapshot recovered from the original `C:\fantasy-politics` workspace.

Neither layer should be assumed to be the final architecture.

## Frontend surfaces

Surviving root pages include:

- `index.html`
- `draft.html`
- `cards.html`
- `votes.html`
- `rules.html`
- `sources.html`
- `web.html`
- scoreboard-related pages/files
- admin/roster tooling

## JavaScript

The `js/` directory contains:

- Draft logic
- Cards logic
- Cards/KPI bridges
- live Cards variants
- Draft feed bridge
- event bus
- multiple Scoreboard iterations
- Votes/live wiring
- header/archive experiments

The number of variants is evidence of active iteration, not a recommendation to keep all of them in a future architecture.

## Styling

CSS includes:

- shared site styles
- scoreboard styles
- namespaced scoreboard styles
- parity experiments

## Node / web server

- `package.json`
- `package-lock.json`
- `server.js`
- Vite configuration/use through package scripts
- Express/CORS/XML/fetch support

Typical surviving development command:

```bash
npm install
npm run dev
```

## Python / data builders

Surviving/recovered tooling includes:

- `app.py`
- `build_master_data.py`
- `build_bill_web.py`
- `build_vote_web.py`
- `official_votes.py`
- `capitol_league_checker.py`
- `capitol_league_rollcall_aggregate.py` in the GitHub-era tree
- later `scripts/build_kpis.py`
- identity mapping utilities

## Data artifacts

Examples include:

- `data/master_state.json`
- roster/team JSON
- standings JSON
- vote JSON
- generated KPI CSV/JSON
- hundreds of recovered House roll-call JSON snapshots
- archived KPI/player/feed data
- an older 117th-Congress test vote/bill snapshot

## Automation

`.github/workflows/build-kpis-python.yml` currently contains a scheduled GitHub Actions KPI build using public data sources and committing generated `dist/` artifacts.

This workflow should be reviewed before being treated as current production architecture.

## Recovered disk snapshot

Location:

`archive/recovered-disk-snapshot/`

This copy was made from the surviving Badass2 directory:

`C:\fantasy-politics`

Excluded:

- `node_modules/`
- `__pycache__/`
- raw credential convenience file

Credential-bearing config files were sanitized in the recovered copy.

The recovered snapshot intentionally retains duplicate/variant files because they are archaeological evidence.

## Why preserve both?

The GitHub repository and disk copy had diverged.

The disk had hundreds of vote snapshots and archive files absent from GitHub.

GitHub had later scripts/config/data not present in the disk folder.

Choosing either one as "the real project" would silently discard useful work.

The 2026 handoff therefore preserves the union while clearly separating current root code from recovered historical material.


## Handoff verification — 2026-10-04

The preserved root project was smoke-tested before publication.

### JavaScript / frontend

`npm ci` completed successfully.

`npm run build` completed successfully with Vite 7.1.12.

One legacy warning remains:

- `shared.js` is loaded as a classic script from `index.html`, so Vite does not bundle it as a module.

The build output itself was reverted after the test so the smoke test did not overwrite the existing tracked KPI artifacts in `dist/`.

### Python

The following surviving Python files passed `python -m py_compile`:

- `app.py`
- `build_bill_web.py`
- `build_master_data.py`
- `build_vote_web.py`
- `capitol_league_checker.py`
- `capitol_league_rollcall_aggregate.py`
- `official_votes.py`
- `scripts/build_kpis.py`
- `scripts/map_bioguide_to_govtrack.py`

### Dependency audit

The existing Node dependency tree currently reports:

- 3 moderate vulnerabilities
- 7 high vulnerabilities
- 1 critical vulnerability

These were **not auto-fixed** during the handoff because `npm audit fix --force` could introduce breaking dependency changes. Dependency modernization belongs in the reboot work rather than the preservation commit.
