# Project Status

**Updated:** 2026-10-04

## Working / substantially built

### Draft

- real House and Senate members
- 12-member roster
- portraits
- chamber / party / state / text filtering
- scores / ratings
- local roster persistence
- remove / clear
- roster export

### Player information

- Cards page
- attendance / missed-vote KPIs
- badge concepts
- GovTrack / Bioguide identity wiring

### Congress activity

- Votes interface
- bill / vote details
- official-source links
- recovered House roll-call snapshots
- master-state data model

### Data tooling

- official House/Senate roll-call aggregator
- KPI builder
- scheduled GitHub Action for KPI refresh
- optional House roll-call proxy

## Historically attempted but not current

These survive on archive branches, not on `main`:

- multiple Scoreboard implementations
- several Cards/KPI bridge generations
- experimental issue-web visualizations
- admin KPI builders
- alternate RAM copies
- older Python data builders
- duplicate CSS / JS implementations

They are preserved as evidence, not presented as production architecture.

## Unfinished

- authoritative scoring formula
- weekly fantasy scoring window
- head-to-head matchup model
- leagues
- trades / waivers
- roster locks
- playoffs / seasons
- accounts
- database persistence
- notifications
- production deployment
- monetization
- paid contest / regulatory model

## Main product risk

The first version became too much of a congressional-data project before the game loop was validated.

The reboot should prove engagement first.

## Next product milestone

Use one frozen completed congressional week.

1. Draft or randomize 12 members.
2. Calculate an understandable weekly result.
3. Show who helped and hurt the roster.
4. Link each scoring event to evidence.
5. Test whether players voluntarily return to check their team.

Do that before rebuilding a full league platform.
