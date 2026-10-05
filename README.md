# Capitol League

**Fantasy sports for Congress.**

Draft real members of the U.S. House and Senate. Their real congressional activity moves your fantasy score.

The product goal is simple:

> Pick a roster — even at random — come back later, and immediately know who helped you and who screwed your team.

## Product direction

Capitol League is **game first, civics second**.

A new player should be able to start in under a minute. The useful information comes after the emotional hook:

```text
Draft a roster
      ↓
Congress does stuff
      ↓
Your score changes
      ↓
"Why did this guy cost me points?"
      ↓
Real vote / bill / source
```

The user should not need to understand congressional procedure before playing.

## What already works

The recovered prototype includes:

- 12-member fantasy roster
- real House and Senate members
- portraits and player cards
- chamber / party / state / name filtering
- roster persistence
- attendance and missed-vote data
- badges and player-rating concepts
- Votes and bill exploration
- historical roll-call data
- scheduled KPI generation from official roll-call feeds

## What is not finished

The biggest missing piece is the **game contract**:

- final scoring rules
- weekly matchup rules
- private/public leagues
- roster locks
- trades / waivers
- playoffs / seasons
- accounts and server-side teams
- monetization
- paid fantasy / wagering decisions

Old experimental formulas are not automatically canon.

## Start here

| Document | Purpose |
| --- | --- |
| [PRODUCT](docs/PRODUCT.md) | What we are building |
| [STATUS](docs/STATUS.md) | What exists vs. what is unfinished |
| [SCORING](docs/SCORING.md) | Known scoring facts and open decisions |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Current repo / data structure |
| [COMPETITION](docs/COMPETITION.md) | Current market snapshot |
| [HISTORY](docs/HISTORY.md) | What the original project actually contained |
| [SECURITY](docs/SECURITY.md) | Secret-handling and cleanup notes |

## Repository layout

```text
.
├── assets/
│   ├── css/
│   └── js/
├── public/
│   └── data/
├── docs/
├── scripts/
├── server/
├── .github/workflows/
├── index.html
├── draft.html
├── cards.html
├── votes.html
├── rules.html
├── sources.html
├── package.json
├── requirements.txt
└── vite.config.js
```

## Run locally

Frontend:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Optional House roll-call proxy:

```bash
npm start
```

Refresh attendance KPIs:

```bash
pip install -r requirements.txt
python scripts/build_kpis.py
```

## Historical recovery

Nothing removed from the cleanup is lost.

- `archive/pre-revival-2026-10-04` preserves the old GitHub repo before the revival.
- `archive/full-recovery-2026-10-04` preserves the full recovered project, including old variants and disk-only files.

Those branches are archaeology. **`main` is the working project.**

## Current design test

Before rebuilding everything, prove one thing:

> Does owning a roster make people voluntarily care what their politicians did?

If yes, the data and league machinery is worth finishing.
