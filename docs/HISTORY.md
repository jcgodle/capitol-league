# Project History

## Original concept

Capitol League was built as **fantasy sports for Congress**.

Real members of Congress were treated as fantasy players.

The user drafted a roster, congressional activity changed player statistics, and Votes/Bills explained what happened.

## What survived

The historical project contained substantial real code, not just mockups:

- Draft UI and roster logic
- Cards
- Votes
- multiple Scoreboard experiments
- KPI tooling
- Python data builders
- master-state data
- roll-call snapshots
- badge logic
- browser persistence
- roster export

## Strong historical decisions

- roster limit: 12
- real legislators
- real portraits
- House / Senate / party / state filters
- real votes underpin stats
- expensive aggregation belongs outside the browser
- official sources should outrank convenience sources
- stored data should survive temporary upstream failures
- visible monetary "Cost" was removed from the Draft UI
- scores/badges should be understandable quickly

## Unresolved historical decisions

The original project never reliably locked:

- final scoring weights
- whether badges directly gave points
- final Workhorse rule
- weekly vs. seasonal scoring authority
- league format
- matchup rules
- trades / waivers
- playoffs
- account model
- server persistence
- monetization

## Why the old build stalled

The project tried to solve too much simultaneously:

```text
live ingestion
-> historical normalization
-> fallbacks
-> identity mapping
-> KPIs
-> scoring
-> badges
-> Draft
-> Cards
-> Votes
-> issue webs
-> Scoreboard
```

The infrastructure problem grew faster than the game-validation work.

## September 2026 archaeology

A reconstruction pass separated:

- **FACT** — backed by surviving code/history
- **PROPOSAL** — discussed but not proven as canon
- **INFERENCE** — reconstructed from evidence
- **UNKNOWN** — not established

That pass confirmed the Draft/team experience was considerably more real than the multiplayer league system.

## October 2026 recovery

The original local workspace was rediscovered on Badass2 at:

`C:\fantasy-politics`

The GitHub repository was also rediscovered.

The two copies had diverged:

- disk contained historical vote snapshots and archive material missing from GitHub
- GitHub contained later automation and scripts missing from disk

A full union/recovery was committed, then frozen on:

`archive/full-recovery-2026-10-04`

The working `main` branch was subsequently cleaned so archaeology no longer obscures the product.

## Historical lesson

The old project proved we can collect and display the data.

The reboot needs to prove that **owning a roster makes the data emotionally relevant**.
