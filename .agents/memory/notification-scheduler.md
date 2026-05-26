---
name: Notification Scheduler
description: Smart push notification scheduler — how it works, trigger endpoints, quiet hours logic
---

## Pattern

File: `artifacts/api-server/src/routes/notifications-scheduler.ts`

Two endpoints:
- `POST /api/push/run-smart-notifications` — admin-triggered, protected by `ADMIN_PASSWORD` env var
- `GET /api/push/cron-trigger?secret=<CRON_SECRET>` — for external cron services

## Checks per user (in order)

1. **Feeding reminder** — if last feeding > `feedingIntervalMinutes` (default 180) min ago, not already sent in 2h
2. **Sleep reminder** — during nap window hours (9–11am, 1–3pm UTC), not sent in 6h
3. **Daily log reminder** — between 6–9pm UTC if zero entries today, not sent in 24h
4. **Streak celebration** — if streak >= 7 and multiple of 7, not sent in 7d
5. **Poll notification** — if active poll and user hasn't responded, not sent in 7d
6. **Weekly recap** — Sundays between 6–8pm UTC, not sent in 7d

## Quiet hours

Skip all notifications between 10pm–7am UTC (`isQuietHours()` function).

**Why:** Reduce stress for new parents. Notifications during sleep hours are counterproductive.

## Key helper

`sendPushToUser(userId, { title, body, type, icon, url })` is defined in `push.ts` and handles subscription lookup + web-push send.
`alreadySentRecently(userId, type, withinMinutes)` checks `notification_history` table.
