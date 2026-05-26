---
name: Dashboard Emotional Value Cards
description: StreakCard and GoodDayCard components on the Dashboard — how they compute and when they show
---

## Components

Both defined at bottom of `artifacts/twintrack/src/pages/Dashboard.tsx`.

### StreakCard

- Shows for streak >= 3 days
- Streak computed from `localStorage.getItem("tt_streak")` — JSON `{lastDate, count}`
- Logic in `useEffect` in Dashboard component; increments each day user visits with twins data
- Key: `tt_streak`
- Milestone messages at: 3, 5, 7, 14, 21, 30 days
- Shows amber gradient, flame icon, dot indicator bar
- Dismissible per session (local state)

**Why:** Streak celebration is the highest-retention emotional hook. Uses localStorage to avoid a new API endpoint.

### GoodDayCard

- Shows when `streak < 3` but `hasGoodDay` is true
- `hasGoodDay = totalFeedings >= 4 || totalDiapers >= 4 || totalSleepMins >= 180` across all twins today
- Shows rose/pink gradient, heart icon
- Displays activity highlights as pill badges (feedings/diapers/sleep)
- Dismissible per session (local state)

## Render order

1. Twin stat cards (existing)
2. StreakCard (if streak >= 3)
3. GoodDayCard (if good day AND streak < 3, avoids double-showing affirmations)
4. WhatsNewCard (existing)
5. For You Today section (existing)
