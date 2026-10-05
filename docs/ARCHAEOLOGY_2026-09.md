# Capitol League Archaeology — September 2026

This document preserves the recovered historical boundary between **what was actually built**, **what was proposed**, and **what remained unknown** before the 2026 revival.

Evidence labels:

- **FACT** — directly supported by recovered code/history.
- **PROPOSAL** — discussed or designed, but not proven as canon.
- **INFERENCE** — reconstruction from multiple facts.
- **UNKNOWN** — not established by surviving evidence.

## What Capitol League was

**FACT:** Capitol League was a fantasy-sports-style game built around real members of the U.S. Congress.

The politicians were the fantasy players.

**FACT:** The Draft interface had:

- a player pool
- a My Team panel
- a 12-member roster limit
- scores
- portraits
- badges
- draft/remove controls
- browser roster persistence
- JSON export

**FACT:** The product was also becoming a civic-information layer with Votes, bill information, vote results, official-source links, filtering, and a bill/issue-web concept.

**INFERENCE:** The clean historical product description is:

> **Fantasy sports for Congress, with real congressional behavior supplying the stats.**

The information layer existed to explain *why* a fantasy player gained or lost value.

It was not merely a political scorecard and it was not historically established as a gambling/prediction product.

## Original game loop

**FACT:** The reconstructed core loop was:

```text
Browse politicians
-> inspect scores/badges
-> draft up to 12
-> retain roster
-> real congressional activity changes player statistics
-> inspect votes/bills explaining the activity
-> compare team performance
```

**FACT:** Legislators could be filtered by chamber, party, state, and search terms.

**FACT:** The Draft was deliberately pushed toward a recognizable fantasy-sports feel.

## Competitive loop status

**FACT:** A Scoreboard existed as a project boundary.

**FACT:** Historical state recorded navigation/header behavior as working while the Scoreboard itself was not complete.

**PROPOSAL:** Week / Season / Career scopes and richer leaderboard filtering were discussed.

**UNKNOWN:** No recovered evidence proves that head-to-head leagues, private leagues, scheduled fantasy matchups, trades, waivers, playoffs, or season resets reached a settled rule system.

## Scoring archaeology

### What is proven

**FACT:** Frontend member records looked up KPI data by GovTrack identity.

The KPI object supplied fields such as:

- `total_votes`
- `missed_votes`
- `score`
- `badges`

**FACT:** If an explicit KPI score did not exist, surviving Draft code could fall back to attendance:

```text
attendance = 1 - missed_votes / total_votes
fallback score = round(attendance * 100)
```

**FACT:** A cost-like value existed internally in some code but visible monetary Cost was deliberately removed from the Draft UI in favor of rating/score and badges.

### Badge families

**FACT:** Surviving code contains these concepts:

| Badge | Intended meaning |
| --- | --- |
| Iron Man | High voting attendance |
| Part-Timer | Low attendance / many missed votes |
| Workhorse | Heavy congressional activity |
| Loyalist | Usually votes with party |
| Rebel | Often breaks with party |
| Moderate | Mixed/cross-party voting behavior |
| Rookie | First term |
| Veteran | Long service |
| Power Broker | Leadership / key committee role |

### What was never settled

**PROPOSAL, NOT CANON:** One example backend formula proposed:

```text
score = attendance * 70 + party loyalty * 30
```

The historical material itself described this as an example.

Do not record 70/30 as the original Capitol League scoring law.

**FACT:** Attendance mattered.

**FACT:** Party behavior mattered.

**FACT:** Legislative activity/workload mattered.

**FACT:** Experience/tenure and leadership were intended to matter at least through badges.

**UNKNOWN:**

- final point weights
- whether badges directly awarded points
- authoritative scoring period
- final sponsorship/cosponsorship values
- final committee/passage/leadership values
- anti-gaming caps/balance rules

This is the most important unresolved historical contract.

## Data and API architecture

### Legislator identity

**FACT:** Draft used the United States Congress Legislators dataset:

`https://unitedstates.github.io/congress-legislators/legislators-current.json`

for identity, terms, chamber, party, state, GovTrack IDs, and Bioguide IDs.

Bioguide IDs were also used for portraits.

### Vote / bill data

**FACT:** The original project root was:

`C:\fantasy-politics`

**FACT:** Operationally evidenced components included:

- `build_master_data.py`
- `build_bill_web.py`
- `data/master_state.json`
- `kpis.json`

**FACT:** Congress.gov was being positioned as a primary live source.

**FACT:** GovTrack was another source/fallback.

**FACT:** A key historical safety rule was:

> If all upstream vote sources fail, preserve the existing stored votes instead of replacing the dataset with emptiness.

### Historical data

**FACT / planned architecture:**

- 2023 onward -> live/current Congress.gov-oriented data
- pre-2023 -> trusted historical sources, cross-check once, then freeze

The goal was to stop old Congresses from depending on live API resolution forever.

### Bill web

**FACT:** `build_bill_web.py` could be executed against bill/vote identifiers.

A 2022 / 117th-Congress example failed because the live master dataset began in 2023.

That failure exposed a data-range architecture mismatch rather than proving the bill-web concept itself was fake.

## Built vs discussed

### Built or strongly evidenced

- styled Draft page
- working Draft JavaScript
- 12-person roster
- filters
- portraits
- badges
- persistence
- remove/clear
- score display
- average team score
- export
- styled Votes page
- runnable Python master-data generation
- runnable bill-web generation
- `kpis.json` interface between statistics and frontend
- Cards surface sharing the member/KPI data model

### Discussed / partial / not proven complete

- richer Scoreboard
- week/season/career scopes
- historical static snapshots merged with live data
- full leadership/committee-aware scoring
- issue webs connecting bills/topics/stakeholders
- authentication
- server-side teams
- multiplayer leagues
- trades/waivers
- notifications
- mobile app
- finalized seasons/playoffs

At least one issue-web visualization used sample graph data. The visualization concept outran the real pipeline.

## What stalled the old version

There was no single fatal bug.

### API reliability

GovTrack server-side access encountered Cloudflare/403 behavior.

### Congress.gov setup

At one point the environment held an instructional placeholder instead of a functioning key, producing API-key failures.

### Historical-range mismatch

Current/live data boundaries were being asked to satisfy older historical examples.

### Scoreboard boundary

The Scoreboard never reached the same confidence level as the Draft/team flow.

### Product validation was buried

The project was simultaneously trying to solve:

```text
live congressional ingestion
-> historical normalization
-> resilient fallbacks
-> identity mapping
-> KPIs
-> scoring
-> badges
-> Draft
-> Cards
-> Votes explorer
-> issue webs
-> Scoreboard
```

**INFERENCE:** The game hypothesis did not get a cheap isolated validation before the congressional-data infrastructure became the dominant project.

## What was supposed to be fun

The strongest surviving insight was ownership:

> "Those are my politicians. What did they do today, and what did it do to my team?"

That turns ordinary political activity into fantasy events:

- missed votes become roster pain
- party breaks become strategic behavior
- obscure productive members become sleepers
- legislative advancement becomes a scoring play

## Monetization archaeology

**UNKNOWN:** No reliable historical evidence establishes a finalized monetization model.

Do not retroactively remember subscriptions, advertising, paid leagues, sponsorships, gambling, premium analytics, or data licensing as original canon.

## Missing historical decisions

Still unknown:

- final scoring formula
- badge point impact
- final Workhorse definition
- scoring period
- Scoreboard rules
- multiplayer rules
- matchup mechanics
- trades/waivers/roster locks
- seasons/playoffs
- account model
- server-side persistence
- production domain/hosting
- monetization
- legal treatment of paid fantasy/political contests
- outside-user validation

## 2026 recovery update

The September archaeology originally could not prove whether `C:\fantasy-politics` still survived.

On October 4, 2026, the directory was found intact on Badass2.

It contained the original frontend, many Scoreboard variants, Python builders, data snapshots, archive folders, and hundreds of House roll-call JSON files.

The GitHub repository `jcgodle/capitol-league` was also rediscovered and was found to contain later files not present in the local disk folder.

The current repository therefore preserves both evidence sets rather than treating either one as complete.

## Historical conclusion

The concept survived.

The UI survived.

The data-engineering work survived.

The final game contract did not.

That is the boundary the 2026 reboot should respect.
