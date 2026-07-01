import { Router, type IRouter } from "express";
import { eq, desc, gte, lte, and, sql, count, isNotNull, inArray } from "drizzle-orm";
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
  pumpRemindersTable,
  onboardingTable,
  milestonesTable,
  monthlyRecapLogsTable,
} from "@workspace/db";
import { sendPushToUser } from "./push";
import { sendTrialReminderEmail, sendMonthlyRecapEmail } from "../lib/email";
import { logger } from "../lib/logger.js";

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

const PUMP_MESSAGES = [
  { title: "Pump time 🥛", body: "Your body works so hard. Time for a quick pump session — you're doing incredible." },
  { title: "Time to pump 🥛", body: "Another pump session keeps your supply strong. You're amazing for sticking with it." },
  { title: "Pump reminder 🍼", body: "Your schedule says it's pump time. Even a short session counts — you're doing brilliantly." },
];

const WEEKLY_MESSAGES = [
  { title: "Your weekly recap is ready 📊", body: "Another incredible week with your twins. Tap to see your highlights — you've achieved so much." },
];

const POLL_MESSAGES = [
  { title: "New twin mom poll! 🗳️", body: "Your voice matters. A quick community poll is waiting — share your twin parenting experience." },
];

const ENGAGEMENT_MESSAGES = [
  { title: "You're doing an amazing job 💕", body: "Every nap logged, every feed recorded — your twins are so lucky to have such a dedicated parent.", url: "/dashboard" },
  { title: "Capture a memory today 📸", body: "Something special happened today. Log it in Memories before the moment slips away.", url: "/milestones" },
  { title: "Ask Twin AI anything ✨", body: "Need help with sleep, feeding, or routines? Your AI twin parenting companion is ready.", url: "/twin-ai" },
  { title: "New in the Community 💬", body: "See what other twin parents are asking today — you might find exactly what you need.", url: "/learn" },
  { title: "Read the Twins Magazine 📚", body: "Expert twin parenting articles, curated just for families like yours.", url: "/learn" },
  { title: "Your twins are growing so fast 💕", body: "Log a milestone before today is over — future-you will treasure this moment.", url: "/milestones" },
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

  // ── 7. Daily engagement (supportive + feature discovery) ──────────────────
  if (h >= 10 && h < 19 && !await alreadySentRecently(userId, "engagement", 1440)) {
    const msg = ENGAGEMENT_MESSAGES[Math.floor(Math.random() * ENGAGEMENT_MESSAGES.length)];
    await sendPushToUser(userId, { title: msg.title, body: msg.body, type: "engagement", icon: "/icon-192.png", url: msg.url });
    sent.push("engagement");
  }

  return { userId, sent };
}

// ── Trial reminder email sender ────────────────────────────────────────────

async function processPumpReminders(): Promise<string[]> {
  const sent: string[] = [];
  if (isQuietHours()) return sent;

  const now = new Date();
  const dueReminders = await db
    .select()
    .from(pumpRemindersTable)
    .where(and(
      eq(pumpRemindersTable.isEnabled, true),
      lte(pumpRemindersTable.nextReminderAt, now),
    ));

  for (const reminder of dueReminders) {
    try {
      const msg = PUMP_MESSAGES[Math.floor(Math.random() * PUMP_MESSAGES.length)];
      await sendPushToUser(reminder.userId, { ...msg, type: "pump-reminder", icon: "/icon-192.png", url: "/pumping" });
      await db
        .update(pumpRemindersTable)
        .set({
          nextReminderAt: new Date(Date.now() + reminder.intervalHours * 3600000),
          updatedAt: new Date(),
        })
        .where(eq(pumpRemindersTable.id, reminder.id));
      sent.push(`pump:${reminder.userId}`);
    } catch (err) {
      logger.error({ err, userId: reminder.userId }, "pump-reminder: send failed");
    }
  }

  return sent;
}

async function processTrialReminders(): Promise<string[]> {
  const sent: string[] = [];
  const now = new Date();
  const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";

  // Also pick up users whose trial expired within the last 24h for the day-0 email
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [trialUsers, expiredTodayUsers] = await Promise.all([
    db.select().from(userPlansTable).where(eq(userPlansTable.status, "trial")),
    db.select().from(userPlansTable).where(
      and(eq(userPlansTable.status, "expired"), gte(userPlansTable.trialEndsAt, yesterday))
    ),
  ]);

  // Day-0 expiry email for users whose trial just ended
  for (const user of expiredTodayUsers) {
    if (!user.userEmail) continue;
    const alreadySent = (user.trialRemindersSent ?? "").split(",").includes("0");
    if (alreadySent) continue;
    const result = await sendTrialReminderEmail({ to: user.userEmail, daysLeft: 0, appUrl });
    if (result.ok) {
      const existing = (user.trialRemindersSent ?? "").split(",").filter(Boolean);
      existing.push("0");
      await db.update(userPlansTable)
        .set({ trialRemindersSent: existing.join(","), updatedAt: new Date() })
        .where(eq(userPlansTable.userId, user.userId));
      await db.insert(analyticsEventsTable).values({
        event: "trial_reminder_0d",
        userId: user.userId,
        properties: { emailId: result.id, daysLeft: 0 },
      }).catch(() => {});
      sent.push(`${user.userId}:0d`);
    }
  }

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

// ── Internal scheduler (called from server startup) ───────────────────────

async function runScheduledTasks(): Promise<void> {
  if (isQuietHours()) return;
  try {
    const subs = await db.select({ userId: pushSubscriptionsTable.userId }).from(pushSubscriptionsTable);
    const uniqueUsers = [...new Set(subs.map((s) => s.userId))];
    await Promise.all(uniqueUsers.map((uid) => processUser(uid).catch(() => null)));
  } catch (err) {
    logger.error({ err }, "notification-scheduler: push error");
  }
  try {
    const sent = await processTrialReminders();
    if (sent.length > 0) {
      logger.info({ sent }, "notification-scheduler: trial reminders sent");
    }
  } catch (err) {
    logger.error({ err }, "notification-scheduler: trial reminder error");
  }
  try {
    const sent = await processPumpReminders();
    if (sent.length > 0) {
      logger.info({ sent }, "notification-scheduler: pump reminders sent");
    }
  } catch (err) {
    logger.error({ err }, "notification-scheduler: pump reminder error");
  }
}

export function startNotificationScheduler(): void {
  const HOUR_MS = 60 * 60 * 1000;
  const schedule = () => setTimeout(async () => {
    await runScheduledTasks();
    schedule();
  }, HOUR_MS);

  // First run 5 min after startup (let server fully warm up)
  setTimeout(async () => {
    await runScheduledTasks();
    schedule();
  }, 5 * 60 * 1000);

  logger.info("notification-scheduler: started (hourly, quiet hours 10pm–7am UTC)");
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

// ── Monthly recap email processing ────────────────────────────────────────

const RECAP_FEATURES = [
  { icon: "🤖", title: "Twin AI", desc: "Ask any twin parenting question, get a warm expert answer", url: "/ai" },
  { icon: "📖", title: "Twins Magazine", desc: "Browse expert twin parenting articles & real family stories", url: "/learn" },
  { icon: "🎓", title: "Twins Academy", desc: "Expert courses on sleep, feeding, NICU life, and more", url: "/learn" },
  { icon: "💝", title: "Memory Cards", desc: "Beautiful milestone cards to capture every first moment", url: "/milestones" },
  { icon: "👨‍👩‍👧‍👦", title: "Caregiver Access", desc: "Share tracking with your partner, nanny, or family", url: "/settings" },
  { icon: "🛁", title: "Bath Tracker", desc: "Track bath time alongside sleep, feeding, and diapers", url: "/bath" },
  { icon: "🌙", title: "Routines", desc: "Morning, bedtime, and outing checklists for the whole family", url: "/routines" },
];

async function processMonthlyRecaps(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const [usersWithEmail, alreadySentRows] = await Promise.all([
    db
      .select({ userId: onboardingTable.userId, email: onboardingTable.email })
      .from(onboardingTable)
      .where(isNotNull(onboardingTable.email)),
    db
      .select({ userId: monthlyRecapLogsTable.userId })
      .from(monthlyRecapLogsTable)
      .where(eq(monthlyRecapLogsTable.month, month)),
  ]);

  const sentSet = new Set(alreadySentRows.map((r) => r.userId));
  const pending = usersWithEmail.filter((u) => u.email && !sentSet.has(u.userId));

  let sent = 0;
  let skipped = 0;

  for (const user of pending.slice(0, 200)) {
    try {
      const userTwins = await db
        .select({ id: twinsTable.id })
        .from(twinsTable)
        .where(eq(twinsTable.userId, user.userId));

      const twinIds = userTwins.map((t) => t.id);
      if (twinIds.length === 0) { skipped++; continue; }

      const [feedRows, sleepRows, diaperRows, memoryRows] = await Promise.all([
        db.select({ c: count() }).from(feedingEntriesTable)
          .where(and(inArray(feedingEntriesTable.twinId, twinIds), gte(feedingEntriesTable.time, monthStart), lte(feedingEntriesTable.time, monthEnd))),
        db.select({ c: count() }).from(sleepEntriesTable)
          .where(and(inArray(sleepEntriesTable.twinId, twinIds), gte(sleepEntriesTable.startTime, monthStart), lte(sleepEntriesTable.startTime, monthEnd))),
        db.select({ c: count() }).from(diaperEntriesTable)
          .where(and(inArray(diaperEntriesTable.twinId, twinIds), gte(diaperEntriesTable.createdAt, monthStart), lte(diaperEntriesTable.createdAt, monthEnd))),
        db.select({ c: count() }).from(milestonesTable)
          .where(and(eq(milestonesTable.userId, user.userId), gte(milestonesTable.createdAt, monthStart), lte(milestonesTable.createdAt, monthEnd))),
      ]);

      const feedCount = Number(feedRows[0]?.c ?? 0);
      const sleepCount = Number(sleepRows[0]?.c ?? 0);
      const diaperCount = Number(diaperRows[0]?.c ?? 0);
      const memoryCount = Number(memoryRows[0]?.c ?? 0);

      if (feedCount + sleepCount + diaperCount < 3) { skipped++; continue; }

      const shuffled = [...RECAP_FEATURES].sort(() => Math.random() - 0.5).slice(0, 3);
      const result = await sendMonthlyRecapEmail({
        to: user.email!,
        firstName: "",
        month: monthName,
        stats: { feedCount, sleepSessions: sleepCount, diaperChanges: diaperCount, memoriesAdded: memoryCount },
        features: shuffled,
        appUrl,
      });

      if (result.ok) {
        await db.insert(monthlyRecapLogsTable).values({
          userId: user.userId,
          month,
          statsJson: JSON.stringify({ feedCount, sleepCount, diaperCount, memoryCount }),
        });
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      logger.error({ err, userId: user.userId }, "Monthly recap failed");
      skipped++;
    }
  }

  logger.info({ month, sent, skipped }, "Monthly recap batch complete");
  return { sent, skipped };
}

// ── POST /api/admin/test-monthly-recap ────────────────────────────────────
router.post("/admin/test-monthly-recap", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const envPw = process.env.ADMIN_PASSWORD;
  const ok =
    (userId && adminIds.includes(userId)) ||
    (envPw && adminPassword && adminPassword === envPw);

  if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }

  const { to } = req.body as { to?: string };
  if (!to || !to.includes("@")) { res.status(400).json({ error: "to (email address) is required" }); return; }

  const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const shuffled = [...RECAP_FEATURES].sort(() => Math.random() - 0.5).slice(0, 3);

  const result = await sendMonthlyRecapEmail({
    to,
    firstName: "",
    month: monthName,
    stats: { feedCount: 42, sleepSessions: 31, diaperChanges: 68, memoriesAdded: 3 },
    features: shuffled,
    appUrl,
  });

  req.log.info({ event: "test_monthly_recap", to, ok: result.ok }, "Test monthly recap sent");
  res.json({ ok: result.ok, id: result.id, error: result.error ?? null });
});

// ── POST /api/admin/send-monthly-recaps ───────────────────────────────────
router.post("/admin/send-monthly-recaps", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const envPw = process.env.ADMIN_PASSWORD;
  const ok =
    (userId && adminIds.includes(userId)) ||
    (envPw && adminPassword && adminPassword === envPw);

  if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }

  const { sent, skipped } = await processMonthlyRecaps();
  req.log.info({ event: "send_monthly_recaps", sent, skipped }, "Monthly recaps dispatched from admin");
  res.json({ ok: true, sent, skipped });
});

// ── POST /api/admin/test-trial-email ─────────────────────────────────────
router.post("/admin/test-trial-email", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const envPw = process.env.ADMIN_PASSWORD;
  const ok =
    (userId && adminIds.includes(userId)) ||
    (envPw && adminPassword && adminPassword === envPw);

  if (!ok) { res.status(403).json({ error: "Forbidden" }); return; }

  const { days, to } = req.body as { days?: number; to?: string };
  if (!to || !to.includes("@")) { res.status(400).json({ error: "to (email address) is required" }); return; }
  if (![1, 3, 7].includes(days ?? 0)) { res.status(400).json({ error: "days must be 1, 3, or 7" }); return; }

  const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";
  const result = await sendTrialReminderEmail({ to, daysLeft: days!, appUrl });

  req.log.info({ event: "test_trial_email", to, days, ok: result.ok }, "Test trial email sent");
  res.json({ ok: result.ok, id: result.id, error: result.error ?? null });
});

export default router;
