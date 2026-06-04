import { Router, type IRouter } from "express";
import { eq, desc, gte, and, sql } from "drizzle-orm";
import {
  db,
  pushSubscriptionsTable,
  notificationPrefsTable,
  notificationHistoryTable,
  twinsTable,
  feedingEntriesTable,
  sleepEntriesTable,
  diaperEntriesTable,
  pollsTable,
  pollResponsesTable,
  userPlansTable,
  analyticsEventsTable,
} from "@workspace/db";
import { sendPushToUser } from "./push";
import { sendTrialReminderEmail } from "../lib/email";

const router: IRouter = Router();

// Warm, supportive copy for each notification type
const FEEDING_MESSAGES = [
  { title: "Time for a feed? 🍼", body: "It's been a little while — your babies might be getting hungry. You're doing beautifully." },
  { title: "Feed window 🍼", body: "Looks like it may be time to check in on a feeding. You've got this, twin mama." },
  { title: "Feeding reminder 💕", body: "It's been 3+ hours since the last log. A little feed might help everyone feel better." },
];

const DIAPER_MESSAGES = [
  { title: "Diaper check time 💧", body: "You're on top of everything — just a gentle nudge to log the latest diaper change." },
];

const SLEEP_MESSAGES = [
  { title: "Nap window 😴", body: "Your twins might be ready for a nap. Rest is everything — for them and for you." },
  { title: "Sleep check 🌙", body: "Could be a good time for a nap window. You're doing an amazing job keeping up with their schedule." },
];

const DAILY_LOG_MESSAGES = [
  { title: "How's your day going? 💕", body: "You haven't logged anything yet today. Even one entry helps you see the beautiful patterns in your twins' day." },
  { title: "Quick log reminder 📝", body: "A tiny moment to log goes a long way. You're building a picture of your twins' first months — that's priceless." },
  { title: "Don't forget to log 🍒", body: "Still time to capture today's moments. Future-you will love having this record of your twins' early days." },
];

const STREAK_MESSAGES = [
  (n: number) => ({ title: `${n}-day streak! 🔥`, body: `You've logged every day for ${n} days. That kind of care and consistency is remarkable. You're an amazing parent.` }),
  (n: number) => ({ title: `${n} days strong 🔥`, body: `You've logged every single day for ${n} days. Your dedication to your twins is genuinely inspiring. Keep it up!` }),
];

const WEEKLY_MESSAGES = [
  { title: "Your weekly recap is ready 📊", body: "Another incredible week with your twins. Tap to see your highlights — you've achieved so much." },
];

const POLL_MESSAGES = [
  { title: "New twin mom poll! 🗳️", body: "Your voice matters. A quick community poll is waiting — share your twin parenting experience." },
];

function isQuietHours(): boolean {
  const h = new Date().getUTCHours();
  return h >= 22 || h < 7;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getMs(isoStr: Date | string): number {
  return new Date(isoStr).getTime();
}

async function getDefaultPrefs(userId: string): Promise<{
  feedingReminders: boolean;
  sleepReminders: boolean;
  milestoneReminders: boolean;
  twinAiTips: boolean;
  weeklyInsights: boolean;
  dailyLogReminder: boolean;
  feedingIntervalMinutes: number;
}> {
  const rows = await db.select().from(notificationPrefsTable).where(eq(notificationPrefsTable.userId, userId));
  if (rows.length === 0) {
    return {
      feedingReminders: true, sleepReminders: true, milestoneReminders: true,
      twinAiTips: true, weeklyInsights: true, dailyLogReminder: true, feedingIntervalMinutes: 180,
    };
  }
  return rows[0];
}

async function alreadySentRecently(userId: string, type: string, withinMinutes: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
  const rows = await db
    .select()
    .from(notificationHistoryTable)
    .where(and(eq(notificationHistoryTable.userId, userId), eq(notificationHistoryTable.type, type), gte(notificationHistoryTable.sentAt, cutoff)))
    .limit(1);
  return rows.length > 0;
}

async function processUser(userId: string): Promise<{ userId: string; sent: string[] }> {
  const sent: string[] = [];
  const prefs = await getDefaultPrefs(userId);

  // Get this user's twins
  const twins = await db.select().from(twinsTable).where(eq(twinsTable.userId, userId));
  if (twins.length === 0) return { userId, sent };

  const today = getToday();
  const now = Date.now();

  // ── 1. Feeding reminder ──────────────────────────────────────────────────
  if (prefs.feedingReminders && !await alreadySentRecently(userId, "feeding-reminder", 120)) {
    for (const twin of twins) {
      const lastFeedings = await db
        .select()
        .from(feedingEntriesTable)
        .where(eq(feedingEntriesTable.twinId, twin.id))
        .orderBy(desc(feedingEntriesTable.time))
        .limit(1);

      if (lastFeedings.length > 0) {
        const minsSince = (now - getMs(lastFeedings[0].time)) / 60000;
        if (minsSince >= prefs.feedingIntervalMinutes && minsSince < prefs.feedingIntervalMinutes + 60) {
          const msg = FEEDING_MESSAGES[Math.floor(Math.random() * FEEDING_MESSAGES.length)];
          await sendPushToUser(userId, { ...msg, type: "feeding-reminder", icon: "/icon-192.png", url: "/feeding" });
          sent.push("feeding-reminder");
          break; // one feeding reminder per run
        }
      }
    }
  }

  // ── 2. Sleep reminder (nap window by time of day) ────────────────────────
  if (prefs.sleepReminders && !await alreadySentRecently(userId, "sleep-reminder", 360)) {
    const h = new Date().getUTCHours();
    const isNapWindow = (h >= 9 && h <= 11) || (h >= 13 && h <= 15);
    if (isNapWindow) {
      const msg = SLEEP_MESSAGES[Math.floor(Math.random() * SLEEP_MESSAGES.length)];
      await sendPushToUser(userId, { ...msg, type: "sleep-reminder", icon: "/icon-192.png", url: "/sleep" });
      sent.push("sleep-reminder");
    }
  }

  // ── 3. Daily log reminder (send between 6pm–9pm if nothing logged today) ─
  const h = new Date().getUTCHours();
  if (prefs.dailyLogReminder && (h >= 18 && h < 21) && !await alreadySentRecently(userId, "daily-log", 1440)) {
    const todayStart = new Date(`${today}T00:00:00Z`);
    const [sleepToday, feedToday, diaperToday] = await Promise.all([
      db.select({ cnt: sql<number>`count(*)` }).from(sleepEntriesTable).where(and(
        eq(sleepEntriesTable.twinId, twins[0].id), gte(sleepEntriesTable.startTime, todayStart)
      )),
      db.select({ cnt: sql<number>`count(*)` }).from(feedingEntriesTable).where(and(
        eq(feedingEntriesTable.twinId, twins[0].id), gte(feedingEntriesTable.time, todayStart)
      )),
      db.select({ cnt: sql<number>`count(*)` }).from(diaperEntriesTable).where(and(
        eq(diaperEntriesTable.twinId, twins[0].id), gte(diaperEntriesTable.createdAt, todayStart)
      )),
    ]);

    const totalToday = Number(sleepToday[0]?.cnt ?? 0) + Number(feedToday[0]?.cnt ?? 0) + Number(diaperToday[0]?.cnt ?? 0);
    if (totalToday === 0) {
      const msg = DAILY_LOG_MESSAGES[Math.floor(Math.random() * DAILY_LOG_MESSAGES.length)];
      await sendPushToUser(userId, { ...msg, type: "daily-log", icon: "/icon-192.png", url: "/dashboard" });
      sent.push("daily-log");
    }
  }

  // ── 4. Streak celebration (check on Sunday evenings or after 7-day milestones) ─
  if (prefs.weeklyInsights && !await alreadySentRecently(userId, "streak", 168 * 60)) {
    // Compute streak: count how many consecutive days have any entry
    const streakDays: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      streakDays.push(d.toISOString().split("T")[0]);
    }

    let streak = 0;
    for (const day of streakDays) {
      const dayStart = new Date(`${day}T00:00:00Z`);
      const dayEnd = new Date(`${day}T23:59:59Z`);
      const [f] = await db.select({ cnt: sql<number>`count(*)` }).from(feedingEntriesTable).where(and(
        eq(feedingEntriesTable.twinId, twins[0].id),
        gte(feedingEntriesTable.time, dayStart),
        sql`${feedingEntriesTable.time} <= ${dayEnd}`,
      ));
      if (Number(f?.cnt ?? 0) > 0) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7 && streak % 7 === 0) {
      const msgFn = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)];
      const msg = msgFn(streak);
      await sendPushToUser(userId, { ...msg, type: "streak", icon: "/icon-192.png", url: "/stats" });
      sent.push("streak");
    }
  }

  // ── 5. New poll notification ──────────────────────────────────────────────
  if (!await alreadySentRecently(userId, "poll", 168 * 60)) {
    const activePolls = await db.select().from(pollsTable).where(eq(pollsTable.isActive, true)).limit(1);
    if (activePolls.length > 0) {
      const poll = activePolls[0];
      const responses = await db.select().from(pollResponsesTable).where(
        and(eq(pollResponsesTable.pollId, poll.id), eq(pollResponsesTable.userId, userId))
      ).limit(1);
      if (responses.length === 0) {
        const msg = POLL_MESSAGES[0];
        await sendPushToUser(userId, { ...msg, type: "poll", icon: "/icon-192.png", url: "/learn?tab=community" });
        sent.push("poll");
      }
    }
  }

  // ── 6. Weekly recap (Sunday evenings) ─────────────────────────────────────
  if (prefs.weeklyInsights && new Date().getUTCDay() === 0 && h >= 18 && h < 20 && !await alreadySentRecently(userId, "weekly", 168 * 60)) {
    const msg = WEEKLY_MESSAGES[0];
    await sendPushToUser(userId, { ...msg, type: "weekly", icon: "/icon-192.png", url: "/stats" });
    sent.push("weekly");
  }

  return { userId, sent };
}

// ── Trial reminder email sender ────────────────────────────────────────────

async function processTrialReminders(): Promise<string[]> {
  const sent: string[] = [];
  const now = new Date();
  const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";

  const trialUsers = await db
    .select()
    .from(userPlansTable)
    .where(eq(userPlansTable.status, "trial"));

  for (const user of trialUsers) {
    if (!user.userEmail) continue;

    const msLeft = user.trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

    if (![7, 3, 1].includes(daysLeft)) continue;

    const alreadySent = (user.trialRemindersSent ?? "").split(",").includes(String(daysLeft));
    if (alreadySent) continue;

    const result = await sendTrialReminderEmail({
      to: user.userEmail,
      daysLeft,
      appUrl,
    });

    if (result.ok) {
      const existing = (user.trialRemindersSent ?? "").split(",").filter(Boolean);
      existing.push(String(daysLeft));
      await db
        .update(userPlansTable)
        .set({ trialRemindersSent: existing.join(","), updatedAt: new Date() })
        .where(eq(userPlansTable.userId, user.userId));

      await db
        .insert(analyticsEventsTable)
        .values({
          event: `trial_reminder_${daysLeft}d`,
          userId: user.userId,
          properties: { emailId: result.id, daysLeft },
        })
        .catch(() => {});

      sent.push(`${user.userId}:${daysLeft}d`);
    }
  }

  return sent;
}

// ── Admin endpoint to manually trigger smart notifications ────────────────

router.post("/push/run-smart-notifications", async (req, res): Promise<void> => {
  if (isQuietHours()) {
    res.json({ skipped: true, reason: "quiet hours (10pm–7am UTC)" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  const { adminPassword: reqPw } = req.body as { adminPassword?: string };
  if (adminPassword && reqPw !== adminPassword) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Get all unique userIds with active push subscriptions
  const subs = await db.select({ userId: pushSubscriptionsTable.userId }).from(pushSubscriptionsTable);
  const uniqueUsers = [...new Set(subs.map((s) => s.userId))];

  const results = await Promise.all(uniqueUsers.map((uid) => processUser(uid).catch(() => ({ userId: uid, sent: [] }))));

  res.json({
    processed: uniqueUsers.length,
    results: results.map((r) => ({ userId: r.userId, sent: r.sent })),
  });
});

// ── Public endpoint for scheduled external cron (protected by secret) ────

router.get("/push/cron-trigger", async (req, res): Promise<void> => {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret && req.query.secret !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (isQuietHours()) {
    res.json({ skipped: true, reason: "quiet hours" });
    return;
  }

  const subs = await db.select({ userId: pushSubscriptionsTable.userId }).from(pushSubscriptionsTable);
  const uniqueUsers = [...new Set(subs.map((s) => s.userId))];
  const [results, trialRemindersSent] = await Promise.all([
    Promise.all(uniqueUsers.map((uid) => processUser(uid).catch(() => ({ userId: uid, sent: [] })))),
    processTrialReminders().catch(() => [] as string[]),
  ]);

  res.json({
    processed: uniqueUsers.length,
    sent: results.flatMap((r) => r.sent).length,
    trialRemindersSent: trialRemindersSent.length,
  });
});

export default router;
