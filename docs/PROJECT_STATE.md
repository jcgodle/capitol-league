# Capitol League — Project State

**Snapshot date:** 2026-10-04

## Executive summary

Capitol League is an unfinished but substantial fantasy-Congress product.

The strongest surviving part is the **draft/team + political-data experience**. The weakest boundary is the actual competitive fantasy-game contract: scoring authority, weekly matchups, leagues, and season mechanics were never finalized.

The previous effort stalled because product validation became entangled with a large congressional data-engineering problem.

## Built / strongly evidenced

### Draft and roster

- Real current legislators as fantasy players
- Maximum roster of 12
- House / Senate filtering
- Party filtering
- State filtering
- Name/search filtering
- Score sorting
- Real member portraits
- Draft / remove / clear controls
- Browser persistence using `cl_my_team`
- Average team score
- Team JSON export

### Legislator presentation

- Member Cards
- Score display
- Badge framework
- Portrait fallback logic
- GovTrack / Bioguide identity wiring

### Votes and bills

- Substantial `votes.html` implementation
- Vote detail / filtering work
- Bill information
- Official-source links
- Bill/issue-web experiments
- Runnable bill-web builder

### Data / KPI layer

- `build_master_data.py`
- `build_bill_web.py`
- `build_vote_web.py`
- `build-kpis.mjs`
- Later Python KPI scripts
- `master_state.json`
- KPI JSON/CSV interfaces
- Existing attendance/missed-vote data
- GitHub Actions KPI build
- Historical vote snapshots recovered from disk

### Scoreboard

Multiple scoreboard implementations/prototypes survive. This means the UI boundary was actively developed, but **the Scoreboard was not historically known-good as a complete game system**.

## Known historical decisions

- Politicians are the fantasy players.
- The core roster limit was 12.
- Real congressional actions drive stats.
- Scores and badges should be quick to understand.
- Expensive historical aggregation belongs in a preprocessing/KPI layer rather than every browser.
- Official/authoritative sources outrank convenience sources.
- Existing stored data should not be destroyed merely because an upstream API temporarily fails.
- Visible monetary "Cost" was removed from the Draft UI.
- Historical and current data may need different ingestion strategies.

## Unfinished / unresolved

- Final scoring formula
- Final Workhorse definition
- Whether badges directly affect points
- Daily vs weekly vs seasonal scoring authority
- Sponsorship/cosponsorship point values
- Committee action point values
- Passage/law point values
- Bipartisanship/cross-party bonuses
- League format
- Head-to-head schedule
- Roster locks
- Trades
- Waivers
- Playoffs
- Season boundaries
- Authentication
- Server-side team storage
- Notifications
- Production deployment architecture
- Monetization
- Paid fantasy / wagering/legal model

## Why the previous build stalled

The old project attempted to solve all of this together:

```text
live ingestion
-> historical normalization
-> source fallbacks
-> identity mapping
-> KPI generation
-> scoring
-> badges
-> draft
-> cards
-> votes
-> issue webs
-> scoreboard
```

The product hypothesis never got a cheap, isolated test before the data infrastructure became the project.

## Current restart constraint

Do not rewrite the project around assumptions that were never historical canon.

Especially:

- 70/30 attendance/party loyalty was a proposal, not a locked rule.
- The Scoreboard was not complete.
- Real multiplayer leagues were not complete.
- Capitol League was not originally a settled gambling/prediction-market product.

The next version should preserve evidence while allowing new rules to be deliberately adopted.
