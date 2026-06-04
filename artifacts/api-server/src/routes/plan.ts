import { Router } from "express";
import { z } from "zod";
import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { Request } from "express";
import { db, userPlansTable, analyticsEventsTable } from "@workspace/db";

const TRIAL_DAYS = 14;
const FOUNDING_PRICE_CENTS = 3900;
const ANNUAL_PRICE_CENTS = 4900;
const MONTHLY_PRICE_CENTS = 599;

const router = Router();

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdminAuth(req: Request): boolean {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  if (userId && getAdminIds().includes(userId)) return true;
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && adminPassword && adminPassword === envPw) return true;
  return false;
}

async function logEvent(
  event: string,
  userId: string | null,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    await db
      .insert(analyticsEventsTable)
      .values({ event, userId, properties: properties ?? null });
  } catch {}
}

// ── GET /api/plan ── auto-starts 14-day trial on first call ────────────────
router.get("/plan", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [row] = await db
    .select()
    .from(userPlansTable)
    .where(eq(userPlansTable.userId, userId));

  if (!row) {
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(
      trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );

    let userEmail: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? null;
    } catch {}

    [row] = await db
      .insert(userPlansTable)
      .values({
        userId,
        userEmail,
        plan: "free",
        status: "trial",
        trialStartedAt,
        trialEndsAt,
      })
      .returning();

    await logEvent("trial_started", userId);
    req.log.info({ event: "trial_started", userId }, "New 14-day trial started");
  }

  const now = new Date();
  let { status, plan } = row;

  if (status === "trial" && row.trialEndsAt < now) {
    status = "expired";
    plan = "free";
    await db
      .update(userPlansTable)
      .set({ status: "expired", updatedAt: now })
      .where(eq(userPlansTable.userId, userId));
    await logEvent("trial_expired", userId);
    req.log.info({ event: "trial_expired", userId }, "Trial expired");
  }

  const isInTrial = status === "trial";
  const isPremium = plan === "premium" || isInTrial;
  const trialDaysLeft = isInTrial
    ? Math.max(
        0,
        Math.ceil(
          (row.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  res.json({
    plan,
    status,
    isInTrial,
    isPremium,
    isFree: !isPremium,
    trialDaysLeft,
    trialEndsAt: row.trialEndsAt.toISOString(),
    isFoundingMom: row.isFoundingMom,
    billingSource: row.billingSource,
    pricing: {
      monthly: { cents: MONTHLY_PRICE_CENTS, label: "$5.99/month" },
      annual: { cents: ANNUAL_PRICE_CENTS, label: "$49/year" },
      founding: isInTrial
        ? { cents: FOUNDING_PRICE_CENTS, label: "$39/year" }
        : null,
    },
  });
});

// ── POST /api/plan/track ── log analytics event ────────────────────────────
const TrackEventSchema = z.object({
  event: z.string().max(100),
  properties: z.record(z.unknown()).optional(),
});

router.post("/plan/track", async (req, res) => {
  const { userId } = getAuth(req);
  const parsed = TrackEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  await logEvent(parsed.data.event, userId ?? null, parsed.data.properties);
  res.status(204).send();
});

// ── POST /api/plan/subscribe-intent ── IAP stub (RevenueCat wires in later) ─
const SubscribeIntentSchema = z.object({
  tier: z.enum(["monthly", "annual", "founding"]),
});

router.post("/plan/subscribe-intent", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SubscribeIntentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { tier } = parsed.data;
  await logEvent("checkout_started", userId, { tier });
  req.log.info({ event: "subscribe_intent", userId, tier }, "Subscribe intent captured");

  res.json({ status: "intent_logged" });
});

// ── GET /api/admin/subscription-analytics ── admin dashboard ───────────────
router.get("/admin/subscription-analytics", async (req, res) => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [totalTrials] = await db
    .select({ c: count() })
    .from(userPlansTable)
    .where(eq(userPlansTable.status, "trial"));

  const [expiredTrials] = await db
    .select({ c: count() })
    .from(userPlansTable)
    .where(eq(userPlansTable.status, "expired"));

  const [activePremium] = await db
    .select({ c: count() })
    .from(userPlansTable)
    .where(
      and(eq(userPlansTable.plan, "premium"), eq(userPlansTable.status, "active")),
    );

  const [foundingMoms] = await db
    .select({ c: count() })
    .from(userPlansTable)
    .where(eq(userPlansTable.isFoundingMom, true));

  const [totalPlans] = await db.select({ c: count() }).from(userPlansTable);

  const totalExpired = Number(expiredTrials?.c ?? 0);
  const totalPremium = Number(activePremium?.c ?? 0);
  const conversionRate =
    totalExpired > 0 ? Math.round((totalPremium / totalExpired) * 100) : 0;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const topEvents = await db
    .select({ event: analyticsEventsTable.event, c: count() })
    .from(analyticsEventsTable)
    .where(gte(analyticsEventsTable.createdAt, thirtyDaysAgo))
    .groupBy(analyticsEventsTable.event)
    .orderBy(desc(count()))
    .limit(25);

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const dailyTrials = await db
    .select({
      date: sql<string>`to_char(${userPlansTable.createdAt}, 'YYYY-MM-DD')`,
      c: count(),
    })
    .from(userPlansTable)
    .where(gte(userPlansTable.createdAt, fourteenDaysAgo))
    .groupBy(sql`to_char(${userPlansTable.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${userPlansTable.createdAt}, 'YYYY-MM-DD')`);

  const [checkoutIntents] = await db
    .select({ c: count() })
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.event, "checkout_started"),
        gte(analyticsEventsTable.createdAt, thirtyDaysAgo),
      ),
    );

  // Most-clicked upgrade source (last 30 days)
  const upgradeBySource = await db
    .select({
      source: sql<string>`${analyticsEventsTable.properties}->>'source'`,
      c: count(),
    })
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.event, "upgrade_button_clicked"),
        gte(analyticsEventsTable.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`${analyticsEventsTable.properties}->>'source'`)
    .orderBy(desc(count()))
    .limit(10);

  res.json({
    summary: {
      totalUsers: Number(totalPlans?.c ?? 0),
      activeTrials: Number(totalTrials?.c ?? 0),
      expiredTrials: totalExpired,
      activePremium: totalPremium,
      foundingMoms: Number(foundingMoms?.c ?? 0),
      conversionRate,
      checkoutIntents: Number(checkoutIntents?.c ?? 0),
    },
    topEvents: topEvents.map((r) => ({
      event: r.event,
      count: Number(r.c),
    })),
    dailyNewTrials: dailyTrials.map((r) => ({
      date: r.date,
      count: Number(r.c),
    })),
    upgradeBySource: upgradeBySource.map((r) => ({
      source: r.source ?? "unknown",
      count: Number(r.c),
    })),
  });
});

export default router;
