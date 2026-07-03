---
name: Trial reminder email idempotency
description: How duplicate trial/milestone emails were prevented in notifications-scheduler.ts
---

Column-based "already sent" checks (e.g. a comma-joined `trialRemindersSent` string checked then updated) are not safe against concurrent scheduler runs (internal hourly timer + external cron trigger overlapping) — both can pass the check before either writes, causing duplicate sends.

**Why:** the check-then-write pattern has a race window; there's no DB-level guarantee only one caller wins.

**How to apply:** for any "send once per milestone" notification/email logic, add a dedicated log table with a unique constraint on `(userId, milestone)`, and claim the milestone via `insert(...).onConflictDoNothing().returning()` *before* sending. Only proceed if a row was returned. Keep any legacy display column (e.g. `trialRemindersSent`) updated too for backward-compat UI, but never trust it as the idempotency source of truth.
