# Scoring Status

## Current status

**UNLOCKED / NOT FINAL.**

The historical code proves that scoring existed as a concept and that attendance, party behavior, activity, tenure, and leadership were considered.

It does **not** establish one final authoritative Capitol League scoring formula.

## Historical facts

The frontend could read KPI records using GovTrack identity.

Known fields included:

- `total_votes`
- `missed_votes`
- `score`
- `badges`

When an explicit score was absent, one surviving Draft implementation could fall back to an attendance percentage:

```text
attendance = 1 - missed_votes / total_votes
fallback score = round(attendance * 100)
```

This fallback should not be mistaken for the future game scoring contract.

## Historical badge families

### Attendance / activity

- Iron Man
- Part-Timer
- Workhorse

### Party behavior

- Loyalist
- Rebel
- Moderate

### Experience / influence

- Rookie
- Veteran
- Power Broker

## Explicit non-canon

An old example suggested:

```text
score = attendance * 70 + party loyalty * 30
```

That was an example/proposal.

**It was never locked as the Capitol League rule.**

## 2026 scoring requirements

The reboot scoring system should be:

1. **Understandable** — the user should know why the score moved.
2. **Event-based** — useful for a feed/box-score presentation.
3. **Source-backed** — every material point event links to evidence.
4. **Hard to spam** — repetitive low-value actions may need caps.
5. **Fair across chambers** — House and Senate have different opportunity structures.
6. **Fair across roles** — leadership/committee access changes opportunity.
7. **Time-bounded** — weekly fantasy competition needs clear scoring windows.
8. **Stable** — rules should not change silently mid-season.

## Candidate event families for a new contract

These are **design candidates, not adopted rules**:

- vote cast
- missed vote
- bill introduced
- bill cosponsored
- amendment offered
- amendment adopted
- committee markup
- committee report
- chamber passage
- second-chamber passage
- enacted legislation
- cross-party vote
- bipartisan sponsorship/cosponsorship
- leadership/committee activity

## Next action

Before rebuilding APIs, freeze one completed week of congressional events and test multiple candidate scoring systems against real rosters.

The first scoring question is not "what formula is elegant?"

It is:

> Does the resulting box score create understandable wins, losses, heroes, and roster regrets?
