# Capitol League

**Fantasy sports for Congress.**

Capitol League turns real members of the U.S. House and Senate into fantasy players. Users draft a roster, real congressional activity changes their score, and the game explains what happened only when the player wants to dig deeper.

> **Product direction:** fantasy first, civics second. A user should be able to hit **Random Draft**, own a team in under a minute, come back later, and immediately see that three of their picks skipped votes and cost them the matchup.

## Status — October 4, 2026

This repository is a **revival/handoff of the original Capitol League project**, not a greenfield mockup.

The surviving project includes:

- Fantasy-style legislator Draft UI
- 12-member roster rule
- House/Senate/party/state/search filtering
- Real legislator portraits
- Local roster persistence and JSON export
- Legislator Cards
- Votes / bill exploration UI
- Score and badge framework
- Scoreboard prototypes
- Node/Vite/Express support
- Python congressional-data builders
- KPI generation tooling
- Historical vote/data snapshots
- GitHub Actions KPI builder
- A recovered local-disk snapshot from the original `C:\fantasy-politics` workspace

The important missing piece is **not the concept**. It is a clean, authoritative game contract tying data -> scoring -> weekly competition.

## Start here

For a technical/product review, read these in order:

1. [Project State](docs/PROJECT_STATE.md)
2. [Product Direction](docs/PRODUCT_DIRECTION.md)
3. [Technical Inventory](docs/TECHNICAL_INVENTORY.md)
4. [Scoring Status](docs/SCORING_STATUS.md)
5. [Competitive Landscape](docs/COMPETITIVE_LANDSCAPE_2026-10.md)
6. [Recovered Archaeology](docs/ARCHAEOLOGY_2026-09.md)

## The game loop

```text
Draft politicians
      |
      v
Real congressional activity happens
      |
      v
Your roster gains / loses points
      |
      v
30-second team box score
      |
      +--> "Why did this player cost me points?"
                     |
                     v
             Votes / bills / source records
```

The education layer is downstream of engagement.

The player should not need to understand congressional procedure before playing.

## What we know worked

The original Draft implementation already supported a 12-person roster, filters, portraits, scores, badges, persistence, remove/clear controls, average team score, and export.

Known badge concepts included:

- Iron Man
- Part-Timer
- Workhorse
- Loyalist
- Rebel
- Moderate
- Rookie
- Veteran
- Power Broker

Votes and bills were intended to explain *why* a fantasy player moved rather than act as a standalone civics textbook.

## What is not settled

Do **not** treat any of these as finished:

- final scoring formula
- weekly scoring period
- head-to-head matchup rules
- public/private league rules
- roster locks
- trades / waivers
- playoffs / season resets
- authentication / accounts
- server-side team persistence
- monetization
- paid fantasy / wagering model

An old 70% attendance / 30% party-loyalty formula was only a proposed example. It is not canon.

## 2026 reboot direction

The reboot target is intentionally smaller than the old infrastructure project:

1. Lock one understandable scoring contract.
2. Freeze one completed congressional week as a test dataset.
3. Let a user draft 12 members or press **Random Draft**.
4. Produce a clear daily/weekly team box score.
5. Make missed work hurt in an immediately understandable way.
6. Let every score event drill down to the real vote/bill/source.
7. Prove people care what "their" politicians do.
8. Only then rebuild live ingestion, accounts, leagues, and monetization.

## Repository layout

- Root HTML/JS/CSS/Python files — surviving GitHub working state
- `data/` — current/repo-era generated and sample data
- `dist/` — generated KPI artifacts
- `scripts/` — later KPI/mapping scripts
- `.github/workflows/` — automated KPI build
- `docs/` — 2026 revival documentation
- `archive/recovered-disk-snapshot/` — sanitized snapshot recovered from `C:\fantasy-politics`
- `archive/pre-revival-2026-10-04` — Git branch preserving the GitHub repo exactly before this handoff

## Running the surviving frontend

The root project is a Vite/Node project:

```bash
npm install
npm run dev
```

Some old pages/data paths are incomplete or stale. The current repo is being preserved for review before architecture is rewritten.

## Security

A previously committed Congress/API credential was discovered in the old public repository. It has been removed from the current working tree and replaced with empty runtime configuration.

**That credential must be treated as compromised and rotated.** Git history may still contain the old value.

No new secrets should be committed. See [Security and Secrets](docs/SECURITY_AND_SECRETS.md).

## Competitive context

As of October 2026, products including **Fantasy Government** and **Politiparty** are operating in the same general category. That validates the market but means "fantasy Congress" alone is no longer differentiation.

Capitol League's intended differentiation is:

**fast onboarding + emotional roster ownership + sports-style presentation + instantly understandable accountability + source-backed drill-down.**

Not an education product that happens to contain a game.

A game that makes the user learn what Congress did because their team just won or lost.
