# Scoring

## Status

**Not finalized.**

The old project established the ingredients of scoring, but not one authoritative formula.

## Proven historical inputs

The surviving code/data establishes that these mattered:

- attendance
- missed votes
- party voting behavior
- legislative workload / activity
- tenure / experience
- leadership / influence concepts

Known KPI fields included:

- `total_votes`
- `missed_votes`
- `score`
- `badges`

One Draft fallback calculated:

```text
attendance = 1 - missed_votes / total_votes
rating = round(attendance * 100)
```

That is a fallback rating, not a complete future game score.

## Historical badges

Attendance / activity:

- Iron Man
- Part-Timer
- Workhorse

Party behavior:

- Loyalist
- Rebel
- Moderate

Experience / influence:

- Rookie
- Veteran
- Power Broker

## Explicitly not canon

An old example proposed:

```text
70% attendance + 30% party loyalty
```

It was an example, not a locked Capitol League rule.

## Requirements for the reboot

The scoring contract should be:

1. understandable
2. event-based
3. source-backed
4. hard to spam
5. fair between House and Senate
6. fair across roles
7. weekly/time-bounded
8. stable during a season

## Candidate event families

Not yet adopted:

- vote cast
- missed vote
- bill introduced
- cosponsorship
- amendment offered/adopted
- committee markup
- committee report
- chamber passage
- second-chamber passage
- enacted legislation
- cross-party vote
- bipartisan work
- leadership / committee actions

## The actual design question

Do not optimize first for mathematical elegance.

Optimize for a box score that creates:

- obvious good days
- obvious bad days
- heroes
- roster regrets
- meaningful weekly matchups

Then balance the math.
