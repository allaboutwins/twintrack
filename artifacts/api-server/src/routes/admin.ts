import { Router, type IRouter } from "express";
import { and, desc, count, isNotNull, eq, gte, sql } from "drizzle-orm";
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
  analyticsEventsTable,
  userPlansTable,
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

// ── GET /api/admin/premium-analytics ─────────────────────────────────────
router.get("/admin/premium-analytics", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    [activeTrials], [trialStartsToday], [trialStartsWeek], [trialStartsMonth],
    [expiredTrials], [activePremium], [foundingMoms],
    [premiumViews], [upgradeClicks], [checkoutStarts],
    [aiUpgradePrompts], [caregiverPrompts],
    topFeatures, topSources, topTiers, dailyTrials,
  ] = await Promise.all([
    db.select({ c: count() }).from(userPlansTable).where(eq(userPlansTable.status, "trial")),
    db.select({ c: count() }).from(userPlansTable).where(gte(userPlansTable.trialStartedAt, today)),
    db.select({ c: count() }).from(userPlansTable).where(gte(userPlansTable.trialStartedAt, weekAgo)),
    db.select({ c: count() }).from(userPlansTable).where(gte(userPlansTable.trialStartedAt, monthAgo)),
    db.select({ c: count() }).from(userPlansTable).where(eq(userPlansTable.status, "expired")),
    db.select({ c: count() }).from(userPlansTable).where(and(eq(userPlansTable.plan, "premium"), eq(userPlansTable.status, "active"))),
    db.select({ c: count() }).from(userPlansTable).where(eq(userPlansTable.isFoundingMom, true)),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "premium_page_viewed"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "upgrade_button_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "checkout_started"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "ai_upgrade_prompt_shown"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "caregiver_upgrade_prompt_shown"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ key: sql<string>`${analyticsEventsTable.properties}->>'feature'`, c: count() })
      .from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "premium_page_viewed"), gte(analyticsEventsTable.createdAt, monthAgo)))
      .groupBy(sql`${analyticsEventsTable.properties}->>'feature'`).orderBy(desc(count())).limit(8),
    db.select({ key: sql<string>`${analyticsEventsTable.properties}->>'source'`, c: count() })
      .from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "upgrade_button_clicked"), gte(analyticsEventsTable.createdAt, monthAgo)))
      .groupBy(sql`${analyticsEventsTable.properties}->>'source'`).orderBy(desc(count())).limit(8),
    db.select({ key: sql<string>`${analyticsEventsTable.properties}->>'tier'`, c: count() })
      .from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "checkout_started"), gte(analyticsEventsTable.createdAt, monthAgo)))
      .groupBy(sql`${analyticsEventsTable.properties}->>'tier'`).orderBy(desc(count())).limit(5),
    db.select({ date: sql<string>`to_char(${userPlansTable.trialStartedAt}, 'YYYY-MM-DD')`, c: count() })
      .from(userPlansTable).where(gte(userPlansTable.trialStartedAt, fourteenDaysAgo))
      .groupBy(sql`to_char(${userPlansTable.trialStartedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${userPlansTable.trialStartedAt}, 'YYYY-MM-DD')`),
  ]);

  const expiredCount = Number(expiredTrials?.c ?? 0);
  const premiumCount = Number(activePremium?.c ?? 0);
  const viewCount = Number(premiumViews?.c ?? 0);
  const clickCount = Number(upgradeClicks?.c ?? 0);
  const checkoutCount = Number(checkoutStarts?.c ?? 0);

  res.json({
    trials: {
      active: Number(activeTrials?.c ?? 0),
      startsToday: Number(trialStartsToday?.c ?? 0),
      startsThisWeek: Number(trialStartsWeek?.c ?? 0),
      startsThisMonth: Number(trialStartsMonth?.c ?? 0),
    },
    conversions: {
      expired: expiredCount,
      premium: premiumCount,
      trialConversionRate: expiredCount > 0 ? Math.round((premiumCount / expiredCount) * 100) : 0,
      viewToClickRate: viewCount > 0 ? Math.round((clickCount / viewCount) * 100) : 0,
      clickToCheckoutRate: clickCount > 0 ? Math.round((checkoutCount / clickCount) * 100) : 0,
    },
    foundingMoms: Number(foundingMoms?.c ?? 0),
    funnel: {
      premiumPageViews: viewCount,
      upgradeClicks: clickCount,
      checkoutStarts: checkoutCount,
      aiUpgradePrompts: Number(aiUpgradePrompts?.c ?? 0),
      caregiverUpgradePrompts: Number(caregiverPrompts?.c ?? 0),
    },
    topFeatures: topFeatures.map((r) => ({ key: r.key ?? "unknown", count: Number(r.c) })),
    topSources: topSources.map((r) => ({ key: r.key ?? "unknown", count: Number(r.c) })),
    topTiers: topTiers.map((r) => ({ key: r.key ?? "unknown", count: Number(r.c) })),
    dailyTrials: dailyTrials.map((r) => ({ date: r.date, count: Number(r.c) })),
  });
});

// ── GET /api/admin/content-analytics ─────────────────────────────────────
router.get("/admin/content-analytics", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [magTotal], magTopIssues, [magReads], [magPremiumClicks],
    [academyTotal], academyTopCourses, [academyBrowse], [academyUpgradePrompts],
  ] = await Promise.all([
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "magazine_opened"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ key: sql<string>`${analyticsEventsTable.properties}->>'issue'`, c: count() })
      .from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "magazine_opened"), gte(analyticsEventsTable.createdAt, monthAgo)))
      .groupBy(sql`${analyticsEventsTable.properties}->>'issue'`).orderBy(desc(count())).limit(10),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "magazine_read"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "magazine_premium_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "academy_course_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ key: sql<string>`${analyticsEventsTable.properties}->>'courseTitle'`, c: count() })
      .from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "academy_course_clicked"), gte(analyticsEventsTable.createdAt, monthAgo)))
      .groupBy(sql`${analyticsEventsTable.properties}->>'courseTitle'`).orderBy(desc(count())).limit(8),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "academy_browse_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "academy_premium_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
  ]);

  const [magUniqueRaw, academyUniqueRaw] = await Promise.all([
    db.selectDistinct({ userId: analyticsEventsTable.userId }).from(analyticsEventsTable)
      .where(and(eq(analyticsEventsTable.event, "magazine_opened"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.selectDistinct({ userId: analyticsEventsTable.userId }).from(analyticsEventsTable)
      .where(and(eq(analyticsEventsTable.event, "academy_course_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
  ]);

  res.json({
    magazine: {
      totalOpens: Number(magTotal?.c ?? 0),
      uniqueUsers: magUniqueRaw.filter((r) => r.userId).length,
      reads: Number(magReads?.c ?? 0),
      premiumClicks: Number(magPremiumClicks?.c ?? 0),
      topIssues: magTopIssues.map((r) => ({ key: r.key ?? "unknown", count: Number(r.c) })),
    },
    academy: {
      totalClicks: Number(academyTotal?.c ?? 0),
      uniqueUsers: academyUniqueRaw.filter((r) => r.userId).length,
      browseClicks: Number(academyBrowse?.c ?? 0),
      upgradePrompts: Number(academyUpgradePrompts?.c ?? 0),
      topCourses: academyTopCourses.map((r) => ({ key: r.key ?? "unknown", count: Number(r.c) })),
    },
  });
});

// ── GET /api/admin/premium-readiness ─────────────────────────────────────
router.get("/admin/premium-readiness", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const revenueCatConnected = !!process.env.REVENUECAT_SECRET_KEY;
  const appleProductsConfigured = !!(
    process.env.REVENUECAT_APPLE_APP_STORE_APP_ID &&
    process.env.VITE_REVENUECAT_IOS_API_KEY
  );
  const googleProductsConfigured = !!(
    process.env.REVENUECAT_GOOGLE_PLAY_STORE_APP_ID &&
    process.env.VITE_REVENUECAT_ANDROID_API_KEY
  );
  const premiumEnabled = process.env.VITE_PREMIUM_ENABLED === "true";
  const trialEmailsEnabled = !!process.env.RESEND_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID ?? null;

  const allReady = revenueCatConnected && appleProductsConfigured && googleProductsConfigured && trialEmailsEnabled;

  res.json({
    allReady,
    premiumEnabled,
    projectId,
    checks: [
      { key: "revenueCatConnected", label: "RevenueCat API key", ok: revenueCatConnected },
      { key: "appleProductsConfigured", label: "Apple / iOS products", ok: appleProductsConfigured },
      { key: "googleProductsConfigured", label: "Google / Android products", ok: googleProductsConfigured },
      { key: "trialEmailsEnabled", label: "Trial reminder emails (Resend)", ok: trialEmailsEnabled },
      { key: "premiumEnabled", label: "Premium paywall enabled (VITE_PREMIUM_ENABLED)", ok: premiumEnabled },
    ],
  });
});

export default router;
