import { Router, type IRouter } from "express";
import { desc, count, isNotNull, eq, sql } from "drizzle-orm";
import {
  db,
  twinsTable,
  onboardingTable,
  feedbackTable,
  sleepEntriesTable,
  feedingEntriesTable,
  diaperEntriesTable,
  milestonesTable,
  videoBookmarksTable,
  videoNotesTable,
} from "@workspace/db";
import { backfillOnboardingRows, type OnboardingRowData } from "../sheets";
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

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [
    uniqueUsers,
    onboardingRecords,
    feedbackRecords,
    [sleepCount],
    [feedingCount],
    [diaperCount],
    [milestoneCount],
    [bookmarkCount],
    [noteCount],
    emailRecords,
    pollsData,
  ] = await Promise.all([
    db.selectDistinct({ userId: twinsTable.userId }).from(twinsTable),
    db.select().from(onboardingTable).orderBy(desc(onboardingTable.createdAt)),
    db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt)).limit(200),
    db.select({ count: count() }).from(sleepEntriesTable),
    db.select({ count: count() }).from(feedingEntriesTable),
    db.select({ count: count() }).from(diaperEntriesTable),
    db.select({ count: count() }).from(milestonesTable),
    db.select({ count: count() }).from(videoBookmarksTable),
    db.select({ count: count() }).from(videoNotesTable),
    db
      .select({ userId: onboardingTable.userId, email: onboardingTable.email, newsletterConsent: onboardingTable.newsletterConsent, createdAt: onboardingTable.createdAt, instagramHandle: onboardingTable.instagramHandle, babyAgeGroup: onboardingTable.babyAgeGroup })
      .from(onboardingTable)
      .where(isNotNull(onboardingTable.email))
      .orderBy(desc(onboardingTable.createdAt)),
    (async () => {
      const { pollsTable, pollResponsesTable } = await import("@workspace/db");
      const polls = await db.select().from(pollsTable).orderBy(desc(pollsTable.createdAt));
      const pollsWithCounts = await Promise.all(
        polls.map(async (poll) => {
          const [{ total }] = await db
            .select({ total: count() })
            .from(pollResponsesTable)
            .where(eq(pollResponsesTable.pollId, poll.id));
          return { ...poll, totalResponses: Number(total) };
        }),
      );
      return pollsWithCounts;
    })(),
  ]);

  const completed = onboardingRecords.filter((r) => r.completedAt);

  function breakdown(field: (r: (typeof completed)[0]) => string | null | undefined) {
    return Object.entries(
      completed.reduce(
        (acc, r) => {
          const key = field(r) ?? "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    )
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, value }));
  }

  const emailList = emailRecords.map((r) => ({
    userId: r.userId,
    email: r.email ?? "",
    newsletterConsent: r.newsletterConsent ?? false,
    createdAt: r.createdAt.toISOString(),
    instagramHandle: r.instagramHandle ?? null,
    babyAgeGroup: r.babyAgeGroup ?? null,
  }));

  res.json({
    users: {
      uniqueUsersWithTwins: uniqueUsers.length,
      onboardingTotal: onboardingRecords.length,
      onboardingCompleted: completed.length,
      ambassadors: completed.filter((r) => r.isAmbassador).length,
      emailsCaptured: emailList.length,
      newsletterSubscribers: emailList.filter((e) => e.newsletterConsent).length,
    },
    onboarding: {
      parentStatus: breakdown((r) => r.parentStatus),
      multipleType: breakdown((r) => r.multipleType),
      babyAgeGroup: breakdown((r) => r.babyAgeGroup),
      isPremature: breakdown((r) => String(r.isPremature ?? "unknown")),
      biggestChallenge: breakdown((r) => r.biggestChallenge),
      featureInterest: breakdown((r) => r.featureInterest),
      discoverySource: breakdown((r) => r.discoverySource),
    },
    feedback: feedbackRecords,
    activity: {
      sleepEntries: Number(sleepCount?.count ?? 0),
      feedingEntries: Number(feedingCount?.count ?? 0),
      diaperEntries: Number(diaperCount?.count ?? 0),
      milestones: Number(milestoneCount?.count ?? 0),
      bookmarks: Number(bookmarkCount?.count ?? 0),
      videoNotes: Number(noteCount?.count ?? 0),
    },
    emails: emailList,
    polls: pollsData,
  });
});

router.post("/admin/backfill-sheets", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.log.info("admin: backfill-sheets triggered");

  const allRecords = await db
    .select()
    .from(onboardingTable)
    .orderBy(desc(onboardingTable.createdAt));

  req.log.info({ total: allRecords.length }, "admin: found onboarding records for backfill");

  const rows: OnboardingRowData[] = allRecords.map((r) => ({
    userId: r.userId,
    multipleType: r.multipleType,
    babyAgeGroup: r.babyAgeGroup,
    isPremature: r.isPremature,
    gestationalAgeWeeks: r.gestationalAgeWeeks,
    hadNicu: r.hadNicu,
    wantsAdjustedAge: r.wantsAdjustedAge,
    biggestChallenge: r.biggestChallenge,
    featureInterest: r.featureInterest,
    discoverySource: r.discoverySource,
    instagramHandle: r.instagramHandle,
    isAmbassador: r.isAmbassador,
    email: r.email,
    newsletterConsent: r.newsletterConsent,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  const result = await backfillOnboardingRows(rows);

  req.log.info(result, "admin: backfill-sheets complete");
  res.json(result);
});

router.post("/admin/polls", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { question, category, options, isActive } = req.body as {
    question?: string;
    category?: string;
    options?: string;
    isActive?: boolean;
  };

  if (!question?.trim() || !options) {
    res.status(400).json({ error: "question and options are required" });
    return;
  }

  const { pollsTable } = await import("@workspace/db");

  const [poll] = await db
    .insert(pollsTable)
    .values({
      question: question.trim(),
      category: category ?? "community",
      options,
      isActive: isActive ?? true,
    })
    .returning();

  req.log.info({ pollId: poll.id, question: poll.question }, "admin: poll created");
  res.status(201).json(poll);
});

router.get("/admin/live-users", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [rows, todayRes, weekRes, monthRes, last30Res] = await Promise.all([
    db.execute(sql`
      SELECT user_id, last_seen, current_page
      FROM user_heartbeats
      WHERE last_seen >= NOW() - INTERVAL '60 minutes'
      ORDER BY last_seen DESC
      LIMIT 200
    `),
    db.execute(sql`SELECT COUNT(*) AS cnt FROM user_heartbeats WHERE last_seen >= DATE_TRUNC('day', NOW())`),
    db.execute(sql`SELECT COUNT(*) AS cnt FROM user_heartbeats WHERE last_seen >= NOW() - INTERVAL '7 days'`),
    db.execute(sql`SELECT COUNT(*) AS cnt FROM user_heartbeats WHERE last_seen >= DATE_TRUNC('month', NOW())`),
    db.execute(sql`SELECT COUNT(*) AS cnt FROM user_heartbeats WHERE last_seen >= NOW() - INTERVAL '30 days'`),
  ]);

  const now = Date.now();
  const users = (rows.rows as { user_id: string; last_seen: string; current_page: string }[]).map(
    (u) => ({
      userId: u.user_id,
      lastSeen: u.last_seen,
      currentPage: u.current_page,
      minutesAgo: Math.round((now - new Date(u.last_seen).getTime()) / 60_000),
    }),
  );

  const toNum = (r: { rows: unknown[] }) => Number((r.rows[0] as { cnt: string }).cnt ?? 0);

  res.json({
    online: users.filter((u) => u.minutesAgo <= 5),
    recent: users.filter((u) => u.minutesAgo > 5 && u.minutesAgo <= 30),
    lastHour: users.filter((u) => u.minutesAgo > 30),
    total: users.length,
    activeToday: toNum(todayRes),
    activeThisWeek: toNum(weekRes),
    activeThisMonth: toNum(monthRes),
    last30Days: toNum(last30Res),
  });
});

export default router;
