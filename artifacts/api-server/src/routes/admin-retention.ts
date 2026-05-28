import { Router, type IRouter } from "express";
import { gte, sql, desc, count, isNotNull } from "drizzle-orm";
import {
  db,
  sleepEntriesTable,
  feedingEntriesTable,
  diaperEntriesTable,
  onboardingTable,
  pushSubscriptionsTable,
  notificationHistoryTable,
} from "@workspace/db";
import type { Request } from "express";

const router: IRouter = Router();

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdmin(userId: string | undefined): boolean {
  return !!userId && getAdminIds().includes(userId);
}

function isAdminAuth(req: Request): boolean {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  if (userId && isAdmin(userId)) return true;
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && adminPassword && adminPassword === envPw) return true;
  return false;
}

router.get("/admin/retention", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const days = Math.min(Number(req.query.days ?? 30), 90);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Helper: run a query and return empty rows on any error (table might not exist in prod yet)
  async function safeQuery(query: Parameters<typeof db.execute>[0]) {
    try {
      return await db.execute(query);
    } catch {
      return { rows: [] };
    }
  }

  // Daily active users: users who logged anything per day (union of sleep/feeding/diaper)
  const [sleepDau, feedingDau, diaperDau, pushSubs, notifStats, signups] = await Promise.all([
    safeQuery(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(DISTINCT user_id) AS users
      FROM sleep_entries
      WHERE created_at >= ${cutoff.toISOString()}
      GROUP BY day ORDER BY day ASC
    `),
    safeQuery(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(DISTINCT user_id) AS users
      FROM feeding_entries
      WHERE created_at >= ${cutoff.toISOString()}
      GROUP BY day ORDER BY day ASC
    `),
    safeQuery(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(DISTINCT user_id) AS users
      FROM diaper_entries
      WHERE created_at >= ${cutoff.toISOString()}
      GROUP BY day ORDER BY day ASC
    `),
    // Push subscription opt-in count over time
    safeQuery(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS new_subs
      FROM push_subscriptions
      WHERE created_at >= ${cutoff.toISOString()}
      GROUP BY day ORDER BY day ASC
    `),
    // Notification open rate by day
    safeQuery(sql`
      SELECT DATE(sent_at AT TIME ZONE 'UTC') AS day,
             COUNT(*) AS sent,
             COUNT(opened_at) AS opened
      FROM notification_history
      WHERE sent_at >= ${cutoff.toISOString()}
      GROUP BY day ORDER BY day ASC
    `),
    // New signups per day
    safeQuery(sql`
      SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS signups
      FROM onboarding
      WHERE created_at >= ${cutoff.toISOString()}
      GROUP BY day ORDER BY day ASC
    `),
  ]);

  // Merge DAU across all three trackers by date
  const dauMap: Record<string, Set<string>> = {};

  function mergeDauRows(rows: { day: unknown; users: unknown }[]) {
    for (const row of rows) {
      const day = String(row.day);
      if (!dauMap[day]) dauMap[day] = new Set();
      // We can't get individual user IDs from count-only queries, so track the max users per day
      // across sources as an approximation. For true DAU we use a separate approach below.
      dauMap[day].add(String(row.users));
    }
  }

  // Build a proper per-day DAU by merging the max across trackers
  const slRows = (sleepDau.rows ?? []) as { day: string; users: string }[];
  const fdRows = (feedingDau.rows ?? []) as { day: string; users: string }[];
  const dpRows = (diaperDau.rows ?? []) as { day: string; users: string }[];

  const daySet = new Set([
    ...slRows.map((r) => r.day),
    ...fdRows.map((r) => r.day),
    ...dpRows.map((r) => r.day),
  ]);

  const dauByDay: { date: string; users: number }[] = [];
  for (const day of [...daySet].sort()) {
    const sl = slRows.find((r) => r.day === day)?.users ?? "0";
    const fd = fdRows.find((r) => r.day === day)?.users ?? "0";
    const dp = dpRows.find((r) => r.day === day)?.users ?? "0";
    // Take max as approximation (true unique across tables would need UNION query)
    dauByDay.push({ date: day, users: Math.max(Number(sl), Number(fd), Number(dp)) });
  }

  // Weekly active users: roll up DAU into 7-day windows
  const wauMap: Record<string, number> = {};
  for (const { date, users } of dauByDay) {
    const d = new Date(date);
    // ISO week key
    const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
    wauMap[weekNum] = (wauMap[weekNum] ?? 0) + users;
  }
  const wauByWeek = Object.entries(wauMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, total]) => ({ users: Math.round(total / 7) })); // avg DAU per week

  // Total push subscribers
  const totalSubsRes = await safeQuery(sql`SELECT COUNT(*) AS "totalSubs" FROM push_subscriptions`);
  const totalSubs = ((totalSubsRes.rows[0] as { totalSubs?: string } | undefined)?.totalSubs) ?? "0";

  // Total users who completed onboarding (registered)
  const totalOnboardedRes = await safeQuery(
    sql`SELECT COUNT(*) AS "totalOnboarded" FROM onboarding WHERE completed_at IS NOT NULL`,
  );
  const totalOnboarded = ((totalOnboardedRes.rows[0] as { totalOnboarded?: string } | undefined)?.totalOnboarded) ?? "0";

  // Push opt-in rate
  const pushOptInRate =
    Number(totalOnboarded) > 0
      ? Math.round((Number(totalSubs) / Number(totalOnboarded)) * 100)
      : 0;

  const pushSubsByDay = (pushSubs.rows ?? []) as { day: string; new_subs: string }[];
  const notifByDay = (notifStats.rows ?? []) as { day: string; sent: string; opened: string }[];
  const signupsByDay = (signups.rows ?? []) as { day: string; signups: string }[];

  res.json({
    days,
    dau: dauByDay,
    wau: wauByWeek,
    pushSubsByDay: pushSubsByDay.map((r) => ({ date: r.day, subs: Number(r.new_subs) })),
    notifByDay: notifByDay.map((r) => ({
      date: r.day,
      sent: Number(r.sent),
      opened: Number(r.opened),
      rate: Number(r.sent) > 0 ? Math.round((Number(r.opened) / Number(r.sent)) * 100) : 0,
    })),
    signupsByDay: signupsByDay.map((r) => ({ date: r.day, signups: Number(r.signups) })),
    totals: {
      pushSubscribers: Number(totalSubs),
      onboardedUsers: Number(totalOnboarded),
      pushOptInRate,
    },
  });
});

export default router;
