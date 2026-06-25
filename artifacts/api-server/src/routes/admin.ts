import { Router, type IRouter } from "express";
import { and, desc, count, isNotNull, eq, gte, lte, gt, sql } from "drizzle-orm";
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
  type UserPlan,
} from "@workspace/db";
import { backfillOnboardingRows, type OnboardingRowData } from "../sheets";
import { clerkClient } from "@clerk/express";
import { sendPayPalAnnouncementEmail, type PayPalSubjectVariant } from "../lib/email.js";
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

  const now = Date.now();
  const oneWeekMs = 7 * 24 * 3600 * 1000;
  const thisWeekSignups = completed.filter((r) => now - new Date(r.createdAt).getTime() < oneWeekMs).length;
  const prevWeekSignups = completed.filter((r) => {
    const age = now - new Date(r.createdAt).getTime();
    return age >= oneWeekMs && age < 2 * oneWeekMs;
  }).length;
  const thisWeekEmails = emailList.filter((r) => now - new Date(r.createdAt).getTime() < oneWeekMs).length;
  const prevWeekEmails = emailList.filter((r) => {
    const age = now - new Date(r.createdAt).getTime();
    return age >= oneWeekMs && age < 2 * oneWeekMs;
  }).length;
  const thisMonthSignups = completed.filter((r) => now - new Date(r.createdAt).getTime() < 30 * 24 * 3600 * 1000).length;
  const prevMonthSignups = completed.filter((r) => {
    const age = now - new Date(r.createdAt).getTime();
    return age >= 30 * 24 * 3600 * 1000 && age < 60 * 24 * 3600 * 1000;
  }).length;

  res.json({
    users: {
      uniqueUsersWithTwins: uniqueUsers.length,
      onboardingTotal: onboardingRecords.length,
      onboardingCompleted: completed.length,
      ambassadors: completed.filter((r) => r.isAmbassador).length,
      emailsCaptured: emailList.length,
      newsletterSubscribers: emailList.filter((e) => e.newsletterConsent).length,
      growth: {
        thisWeekSignups,
        prevWeekSignups,
        thisWeekEmails,
        prevWeekEmails,
        thisMonthSignups,
        prevMonthSignups,
      },
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

  const rcWebhookKey  = !!process.env.REVENUECAT_SECRET_KEY;
  const iosApiKey     = !!process.env.VITE_REVENUECAT_IOS_API_KEY;
  const androidApiKey = !!process.env.VITE_REVENUECAT_ANDROID_API_KEY;
  const projectId     = process.env.REVENUECAT_PROJECT_ID ?? null;
  const resendKey     = !!process.env.RESEND_API_KEY;
  const premiumEnabled = process.env.VITE_PREMIUM_ENABLED === "true";

  // Auto-check: analytics events and paywall view tracking
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [[totalEvents], [upgradeEvents], [trialCount]] = await Promise.all([
    db.select({ c: count() }).from(analyticsEventsTable),
    db.select({ c: count() }).from(analyticsEventsTable).where(
      and(eq(analyticsEventsTable.event, "premium_page_viewed"), gte(analyticsEventsTable.createdAt, monthAgo))
    ),
    db.select({ c: count() }).from(userPlansTable),
  ]);

  const totalEventsCount   = Number(totalEvents?.c  ?? 0);
  const upgradeEventsCount = Number(upgradeEvents?.c ?? 0);
  const trialUsersCount    = Number(trialCount?.c    ?? 0);
  const analyticsWorking   = totalEventsCount > 0;
  const upgradeTracked     = upgradeEventsCount > 0 || trialUsersCount > 0;

  const allAutoReady = rcWebhookKey && iosApiKey && androidApiKey && resendKey;

  res.json({
    allAutoReady,
    premiumEnabled,
    projectId,
    packages: [
      { tier: "Founding Moms", price: "$39/yr (forever)", rcId: "founding_annual", store: "Both stores" },
      { tier: "Annual",        price: "$49/yr",           rcId: "$rc_annual",       store: "Both stores" },
      { tier: "Monthly",       price: "$5.99/mo",         rcId: "$rc_monthly",      store: "Both stores" },
    ],
    autoChecks: [
      {
        key: "rcWebhookKey",
        label: "RevenueCat webhook key",
        ok: rcWebhookKey,
        detail: rcWebhookKey ? "REVENUECAT_SECRET_KEY is set" : "Set REVENUECAT_SECRET_KEY env var",
      },
      {
        key: "iosApiKey",
        label: "iOS RevenueCat API key",
        ok: iosApiKey,
        detail: iosApiKey ? "VITE_REVENUECAT_IOS_API_KEY is set" : "Set VITE_REVENUECAT_IOS_API_KEY env var",
      },
      {
        key: "androidApiKey",
        label: "Android RevenueCat API key",
        ok: androidApiKey,
        detail: androidApiKey ? "VITE_REVENUECAT_ANDROID_API_KEY is set" : "Set VITE_REVENUECAT_ANDROID_API_KEY env var",
      },
      {
        key: "trialEmails",
        label: "Trial reminder emails",
        ok: resendKey,
        detail: resendKey ? "Resend key configured · 7d/3d/1d emails ready" : "Set RESEND_API_KEY env var",
      },
      {
        key: "analyticsWorking",
        label: "Analytics events tracking",
        ok: analyticsWorking,
        detail: analyticsWorking
          ? `${totalEventsCount} events total · ${upgradeEventsCount} paywall views (30d)`
          : "No events recorded yet — open the app to generate events",
      },
      {
        key: "upgradeTracked",
        label: "Upgrade funnel tracking",
        ok: upgradeTracked,
        detail: upgradeTracked
          ? `${upgradeEventsCount} paywall views · ${trialUsersCount} trial users`
          : "No upgrade events yet — trigger an upgrade screen to test",
      },
    ],
  });
});

// ── GET /api/admin/founding-moms ─────────────────────────────────────────
router.get("/admin/founding-moms", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const now = new Date();
  const in1Day  = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    [total], [active],
    [ending7], [ending3], [ending1],
    [foundingConv], [annual], [monthly],
    [verificationFailures7d], [verificationFailuresTotal],
  ] = await Promise.all([
    db.select({ c: count() }).from(userPlansTable),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.status, "trial"), gt(userPlansTable.trialEndsAt, now)),
    ),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.status, "trial"), gt(userPlansTable.trialEndsAt, now), lte(userPlansTable.trialEndsAt, in7Days)),
    ),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.status, "trial"), gt(userPlansTable.trialEndsAt, now), lte(userPlansTable.trialEndsAt, in3Days)),
    ),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.status, "trial"), gt(userPlansTable.trialEndsAt, now), lte(userPlansTable.trialEndsAt, in1Day)),
    ),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.isFoundingMom, true), eq(userPlansTable.status, "active")),
    ),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.plan, "annual"), eq(userPlansTable.status, "active")),
    ),
    db.select({ c: count() }).from(userPlansTable).where(
      and(eq(userPlansTable.plan, "monthly"), eq(userPlansTable.status, "active")),
    ),
    db.select({ c: count() }).from(analyticsEventsTable).where(
      and(eq(analyticsEventsTable.event, "rc_verification_failure"), gte(analyticsEventsTable.createdAt, sevenDaysAgo)),
    ),
    db.select({ c: count() }).from(analyticsEventsTable).where(
      eq(analyticsEventsTable.event, "rc_verification_failure"),
    ),
  ]);

  const totalN    = Number(total?.c    ?? 0);
  const annualN   = Number(annual?.c   ?? 0);
  const monthlyN  = Number(monthly?.c  ?? 0);
  const foundingN = Number(foundingConv?.c ?? 0);
  const paidTotal = annualN + monthlyN + foundingN;
  const conversionPct = totalN > 0 ? Math.round((paidTotal / totalN) * 1000) / 10 : 0;
  // MRR in dollars
  const mrr = Math.round((annualN * (49 / 12) + monthlyN * 5.99 + foundingN * (39 / 12)) * 100) / 100;

  res.json({
    totalTrialUsers:            totalN,
    activeTrialUsers:           Number(active?.c   ?? 0),
    endingIn7Days:              Number(ending7?.c  ?? 0),
    endingIn3Days:              Number(ending3?.c  ?? 0),
    endingIn1Day:               Number(ending1?.c  ?? 0),
    foundingMomConversions:     foundingN,
    annualPurchases:            annualN,
    monthlyPurchases:           monthlyN,
    conversionPct,
    mrr,
    arr:                        Math.round(mrr * 12 * 100) / 100,
    verificationFailures7d:     Number(verificationFailures7d?.c  ?? 0),
    verificationFailuresTotal:  Number(verificationFailuresTotal?.c ?? 0),
  });
});

// ── GET /api/admin/founding-moms/csv ─────────────────────────────────────
router.get("/admin/founding-moms/csv", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const [rows, onboardingEmails] = await Promise.all([
    db.select({
      userId:      userPlansTable.userId,
      email:       userPlansTable.userEmail,
      signupDate:  userPlansTable.createdAt,
      trialEndDate: userPlansTable.trialEndsAt,
      plan:        userPlansTable.plan,
      status:      userPlansTable.status,
      isFoundingMom: userPlansTable.isFoundingMom,
      convertedAt: userPlansTable.convertedAt,
    }).from(userPlansTable).orderBy(desc(userPlansTable.createdAt)),
    db.select({ userId: onboardingTable.userId, email: onboardingTable.email })
      .from(onboardingTable).where(isNotNull(onboardingTable.email)),
  ]);

  const emailMap = new Map(onboardingEmails.map((o) => [o.userId, o.email]));

  type Row = typeof rows[number];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const fmtDate = (d: Date | null) => d ? d.toISOString().split("T")[0] : "";

  const header = ["email", "signup_date", "trial_end_date", "plan_selected", "status", "is_founding_mom", "conversion_date"];
  const csvRows = rows.map((r: Row) => [
    r.email ?? emailMap.get(r.userId) ?? "",
    fmtDate(r.signupDate),
    fmtDate(r.trialEndDate),
    r.plan,
    r.status,
    r.isFoundingMom ? "yes" : "no",
    fmtDate(r.convertedAt),
  ]);

  const csv = [header, ...csvRows]
    .map((row) => row.map((v) => escape(String(v))).join(","))
    .join("\n");

  const dateStr = new Date().toISOString().split("T")[0];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="founding-moms-${dateStr}.csv"`);
  res.send(csv);
});

// ── POST /api/admin/extend-trial ─────────────────────────────────────────────
router.post("/admin/extend-trial", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { userId, days = 7 } = req.body as { userId?: string; days?: number };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  if (typeof days !== "number" || days < 1 || days > 365) {
    res.status(400).json({ error: "days must be 1–365" }); return;
  }

  const [existing] = await db.select().from(userPlansTable).where(eq(userPlansTable.userId, userId));
  if (!existing) { res.status(404).json({ error: "User plan not found" }); return; }

  const base = existing.trialEndsAt < new Date() ? new Date() : existing.trialEndsAt;
  const newTrialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await db.update(userPlansTable)
    .set({
      trialEndsAt: newTrialEndsAt,
      status: "trial",
      updatedAt: new Date(),
    })
    .where(eq(userPlansTable.userId, userId));

  await db.insert(analyticsEventsTable).values({
    event: "admin_trial_extended",
    userId,
    properties: { days, newTrialEndsAt: newTrialEndsAt.toISOString(), extendedBy: "admin" },
  }).catch(() => {});

  res.json({ ok: true, userId, days, newTrialEndsAt });
});

// ── POST /api/admin/extend-trial/bulk ─────────────────────────────────────────
router.post("/admin/extend-trial/bulk", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { cohort, days = 7 } = req.body as { cohort?: "expired" | "ending-7d"; days?: number };
  if (!cohort || !["expired", "ending-7d"].includes(cohort)) {
    res.status(400).json({ error: "cohort must be 'expired' or 'ending-7d'" }); return;
  }
  if (typeof days !== "number" || days < 1 || days > 365) {
    res.status(400).json({ error: "days must be 1–365" }); return;
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const users = cohort === "expired"
    ? await db.select().from(userPlansTable).where(eq(userPlansTable.status, "expired"))
    : await db.select().from(userPlansTable).where(
        and(eq(userPlansTable.status, "trial"), lte(userPlansTable.trialEndsAt, in7Days))
      );

  let extended = 0;
  for (const user of users) {
    const base = user.trialEndsAt < now ? now : user.trialEndsAt;
    const newTrialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    await db.update(userPlansTable)
      .set({ trialEndsAt: newTrialEndsAt, status: "trial", updatedAt: new Date() })
      .where(eq(userPlansTable.userId, user.userId));
    await db.insert(analyticsEventsTable).values({
      event: "admin_trial_extended",
      userId: user.userId,
      properties: { days, cohort, newTrialEndsAt: newTrialEndsAt.toISOString(), extendedBy: "admin_bulk" },
    }).catch(() => {});
    extended++;
  }

  res.json({ ok: true, cohort, days, extended });
});

// ── GET /api/admin/trial-cohorts ─────────────────────────────────────────────
router.get("/admin/trial-cohorts", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [expired, endingSoon] = await Promise.all([
    db.select({
      userId: userPlansTable.userId,
      userEmail: userPlansTable.userEmail,
      trialEndsAt: userPlansTable.trialEndsAt,
      status: userPlansTable.status,
      plan: userPlansTable.plan,
    }).from(userPlansTable)
      .where(eq(userPlansTable.status, "expired"))
      .orderBy(desc(userPlansTable.trialEndsAt)),

    db.select({
      userId: userPlansTable.userId,
      userEmail: userPlansTable.userEmail,
      trialEndsAt: userPlansTable.trialEndsAt,
      status: userPlansTable.status,
      plan: userPlansTable.plan,
    }).from(userPlansTable)
      .where(and(
        eq(userPlansTable.status, "trial"),
        lte(userPlansTable.trialEndsAt, in7Days)
      ))
      .orderBy(userPlansTable.trialEndsAt),
  ]);

  res.json({ expired, endingSoon });
});

// ── GET /api/admin/trial-cohorts/csv ─────────────────────────────────────────
router.get("/admin/trial-cohorts/csv", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { cohort = "expired" } = req.query as { cohort?: string };
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rows = cohort === "ending-7d"
    ? await db.select().from(userPlansTable)
        .where(and(eq(userPlansTable.status, "trial"), lte(userPlansTable.trialEndsAt, in7Days)))
        .orderBy(userPlansTable.trialEndsAt)
    : await db.select().from(userPlansTable)
        .where(eq(userPlansTable.status, "expired"))
        .orderBy(desc(userPlansTable.trialEndsAt));

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const fmtDate = (d: Date | null) => d ? d.toISOString().replace("T", " ").slice(0, 19) : "";

  const header = ["user_id", "email", "trial_ends_at", "status", "plan", "is_founding_mom", "trial_reminders_sent"];
  const csvRows = rows.map((r) => [
    r.userId, r.userEmail ?? "", fmtDate(r.trialEndsAt),
    r.status, r.plan, r.isFoundingMom ? "yes" : "no", r.trialRemindersSent ?? "",
  ]);

  const csv = [header, ...csvRows].map((row) => row.map((v) => escape(String(v))).join(",")).join("\n");
  const dateStr = now.toISOString().split("T")[0];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="trial-cohort-${cohort}-${dateStr}.csv"`);
  res.send(csv);
});

// ── GET /api/admin/feature-adoption ─────────────────────────────────────────

router.get("/admin/feature-adoption", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [aiOpens], aiUniqueUsers,
    [memoriesOpens], memoriesUniqueUsers,
    [caregiverViews],
    [communityQs],
    [spotlightClicks],
    spotlightByFeature,
  ] = await Promise.all([
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "twin_ai_opened"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.selectDistinct({ userId: analyticsEventsTable.userId }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "twin_ai_opened"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "memories_opened"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.selectDistinct({ userId: analyticsEventsTable.userId }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "memories_opened"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "caregiver_invite_viewed"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "community_question_submitted"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ c: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.event, "spotlight_card_clicked"), gte(analyticsEventsTable.createdAt, monthAgo))),
    db.select({ key: sql<string>`${analyticsEventsTable.properties}->>'feature'`, c: count() })
      .from(analyticsEventsTable)
      .where(and(eq(analyticsEventsTable.event, "spotlight_card_clicked"), gte(analyticsEventsTable.createdAt, monthAgo)))
      .groupBy(sql`${analyticsEventsTable.properties}->>'feature'`).orderBy(desc(count())).limit(8),
  ]);

  res.json({
    twinAI: { opens: Number(aiOpens?.c ?? 0), uniqueUsers: aiUniqueUsers.length },
    memories: { opens: Number(memoriesOpens?.c ?? 0), uniqueUsers: memoriesUniqueUsers.length },
    caregiver: { views: Number(caregiverViews?.c ?? 0) },
    community: { questions: Number(communityQs?.c ?? 0) },
    spotlight: {
      totalClicks: Number(spotlightClicks?.c ?? 0),
      byFeature: spotlightByFeature.map((r) => ({ feature: r.key ?? "unknown", count: Number(r.c) })),
    },
  });
});

// ── POST /admin/paypal-announcement ──────────────────────────────────────────
// Sends the PayPal launch announcement email to all active trial users.
// Pass { testEmail } to send a preview to a single address instead.
router.post("/admin/paypal-announcement", async (req: Request, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { testEmail, subjectVariant = "A" } = req.body as { testEmail?: string; subjectVariant?: PayPalSubjectVariant };
  const APP_URL = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";

  try {
    if (testEmail) {
      // Preview mode — send to the provided email with sample content
      const result = await sendPayPalAnnouncementEmail({
        to: testEmail,
        trialExtended: true,
        newTrialEndDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        appUrl: APP_URL,
      }, subjectVariant);
      req.log.info({ testEmail, subjectVariant, result }, "admin: paypal-announcement preview sent");
      res.json({ mode: "preview", testEmail, subjectVariant, result });
      return;
    }

    // Broadcast mode — fetch all active trial users from DB then get emails from Clerk
    const trialUsers = await db
      .select({ userId: userPlansTable.userId, trialEndsAt: userPlansTable.trialEndsAt, updatedAt: userPlansTable.updatedAt })
      .from(userPlansTable)
      .where(and(eq(userPlansTable.plan, "free"), eq(userPlansTable.status, "trial")));

    const results: { userId: string; email: string; ok: boolean; error?: string }[] = [];
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000);

    for (const row of trialUsers) {
      try {
        const clerkUser = await clerkClient.users.getUser(row.userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        if (!email) { results.push({ userId: row.userId, email: "(none)", ok: false, error: "no email on Clerk account" }); continue; }

        // Was this trial recently extended? (updated in the last 24h and trialEndsAt was bumped)
        const recentlyExtended = (Date.now() - new Date(row.updatedAt ?? 0).getTime()) < 86400000;

        const emailResult = await sendPayPalAnnouncementEmail({
          to: email,
          trialExtended: recentlyExtended,
          newTrialEndDate: new Date(row.trialEndsAt ?? sevenDaysFromNow).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          appUrl: APP_URL,
        }, subjectVariant);
        results.push({ userId: row.userId, email, ok: emailResult.ok, error: emailResult.error });

        await db.insert(analyticsEventsTable).values({
          event: "paypal_announcement_email_sent",
          userId: row.userId,
          properties: { email, trialExtended: recentlyExtended },
        }).catch(() => {});
      } catch (err) {
        results.push({ userId: row.userId, email: "(error)", ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    req.log.info({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length }, "admin: paypal-announcement broadcast complete");
    res.json({ mode: "broadcast", total: trialUsers.length, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err: msg }, "admin: paypal-announcement failed");
    res.status(500).json({ error: msg });
  }
});

export default router;
