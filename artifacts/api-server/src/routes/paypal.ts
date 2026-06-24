import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userPlansTable, analyticsEventsTable } from "@workspace/db";
import type { Request } from "express";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

const PAYPAL_BASE = process.env.PAYPAL_ENV === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

const FOUNDING_MOMS_PRICE_CENTS = 3900;
const FOUNDING_MOMS_PRICE_USD = "39.00";
const PLAN_NAME = "TwinTrack Founding Moms Annual";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const creds = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal auth failed: ${body}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function paypalRequest(
  path: string,
  method: "GET" | "POST" | "PATCH",
  token: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

// Runtime cache (cleared on restart — always backed by env or PayPal list lookup)
let cachedPlanId: string | null = null;

async function getOrCreateBillingPlan(token: string): Promise<string> {
  // 1. Pinned via env var — fastest path, set this after first run
  if (process.env.PAYPAL_BILLING_PLAN_ID) {
    cachedPlanId = process.env.PAYPAL_BILLING_PLAN_ID;
    return cachedPlanId;
  }

  // 2. In-memory cache from this server instance
  if (cachedPlanId) return cachedPlanId;

  // 3. Look up existing active plans on PayPal to avoid creating duplicates on restart
  const existing = await paypalRequest("/v1/billing/plans?page_size=20&status=ACTIVE", "GET", token, undefined) as {
    plans?: { id: string; name: string }[];
  };
  const found = existing.plans?.find((p) => p.name === PLAN_NAME);
  if (found) {
    cachedPlanId = found.id;
    return cachedPlanId;
  }

  // 4. First-ever run: create product + plan
  const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";
  const product = await paypalRequest("/v1/catalogs/products", "POST", token, {
    name: "TwinTrack Premium",
    description: "Premium access to TwinTrack — the all-in-one app for twin parents.",
    type: "SERVICE",
    category: "SOFTWARE",
    home_url: appUrl,
  }) as { id: string };

  const plan = await paypalRequest("/v1/billing/plans", "POST", token, {
    product_id: product.id,
    name: PLAN_NAME,
    description: "Annual subscription — locked in forever at the Founding Moms rate.",
    billing_cycles: [
      {
        frequency: { interval_unit: "YEAR", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: FOUNDING_MOMS_PRICE_USD, currency_code: "USD" },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: "0", currency_code: "USD" },
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  }) as { id: string };

  cachedPlanId = plan.id;
  return plan.id;
}

// ── POST /api/paypal/create-subscription ─────────────────────────────────────
// Creates a PayPal subscription and returns the approval URL for the client to redirect to.
router.post("/paypal/create-subscription", async (req: Request, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const appUrl = process.env.APP_URL ?? "https://twintrack.allaboutwins.com";
    const token = await getPayPalAccessToken();
    const planId = await getOrCreateBillingPlan(token);

    const subscription = await paypalRequest("/v1/billing/subscriptions", "POST", token, {
      plan_id: planId,
      custom_id: userId,
      application_context: {
        brand_name: "TwinTrack",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${appUrl}/paypal/success?userId=${userId}`,
        cancel_url: `${appUrl}/paypal/cancel`,
      },
    }) as { id: string; links: { href: string; rel: string }[] };

    const approvalUrl = subscription.links.find((l) => l.rel === "approve")?.href;
    if (!approvalUrl) { res.status(500).json({ error: "No approval URL from PayPal" }); return; }

    await db.insert(analyticsEventsTable).values({
      event: "paypal_subscription_initiated",
      userId,
      properties: { subscriptionId: subscription.id },
    }).catch(() => {});

    res.json({ subscriptionId: subscription.id, approvalUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/paypal/activate ─────────────────────────────────────────────────
// Called after user returns from PayPal approval. Verifies subscription and activates premium.
router.post("/paypal/activate", async (req: Request, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { subscriptionId } = req.body as { subscriptionId?: string };
    if (!subscriptionId) { res.status(400).json({ error: "subscriptionId required" }); return; }

    const token = await getPayPalAccessToken();

    // Poll for up to 20 seconds — PayPal sandbox (and sometimes live) takes a few seconds
    // to transition APPROVAL_PENDING → APPROVED after the user clicks "Subscribe Now".
    type SubResponse = { id: string; status: string; custom_id: string; plan_id: string };
    let sub: SubResponse | null = null;
    const MAX_ATTEMPTS = 10;
    const DELAY_MS = 2000;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const fetched = await paypalRequest(
        `/v1/billing/subscriptions/${subscriptionId}`, "GET", token, undefined
      ) as SubResponse;

      // Security check on first read — bail immediately if ownership mismatch
      if (attempt === 1 && fetched.custom_id !== userId) {
        res.status(403).json({ error: "Subscription does not belong to this user" }); return;
      }

      if (["ACTIVE", "APPROVED"].includes(fetched.status)) {
        sub = fetched;
        break;
      }
      if (fetched.status === "APPROVAL_PENDING" && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      // Any other terminal status — fail immediately
      res.status(400).json({ error: `Subscription status is ${fetched.status} — payment not confirmed` }); return;
    }
    if (!sub) {
      res.status(408).json({ error: "PayPal subscription approval timed out — please contact support" }); return;
    }

    // Activate premium in user_plans
    const now = new Date();
    await db.update(userPlansTable)
      .set({
        plan: "premium",
        status: "active",
        isFoundingMom: true,
        foundingPriceCents: FOUNDING_MOMS_PRICE_CENTS,
        billingSource: "paypal",
        externalSubscriptionId: subscriptionId,
        convertedAt: now,
        updatedAt: now,
      })
      .where(eq(userPlansTable.userId, userId));

    await db.insert(analyticsEventsTable).values({
      event: "paypal_subscription_activated",
      userId,
      properties: {
        subscriptionId,
        planId: sub.plan_id,
        priceCents: FOUNDING_MOMS_PRICE_CENTS,
        billingSource: "paypal",
        isFoundingMom: true,
      },
    }).catch(() => {});

    res.json({ ok: true, plan: "premium", status: "active", isFoundingMom: true, billingSource: "paypal" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/paypal/webhook ──────────────────────────────────────────────────
// Handles PayPal subscription lifecycle webhooks (renewal, cancellation, suspension).
router.post("/paypal/webhook", async (req, res): Promise<void> => {
  // Verify PayPal signature if PAYPAL_WEBHOOK_ID is configured
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (webhookId) {
    try {
      const token = await getPayPalAccessToken();
      const verification = await paypalRequest(
        "/v1/notifications/verify-webhook-signature",
        "POST",
        token,
        {
          auth_algo: req.headers["paypal-auth-algo"],
          cert_url: req.headers["paypal-cert-url"],
          transmission_id: req.headers["paypal-transmission-id"],
          transmission_sig: req.headers["paypal-transmission-sig"],
          transmission_time: req.headers["paypal-transmission-time"],
          webhook_id: webhookId,
          webhook_event: req.body,
        }
      ) as { verification_status: string };
      if (verification.verification_status !== "SUCCESS") {
        res.status(400).json({ error: "Invalid PayPal webhook signature" });
        return;
      }
    } catch {
      res.status(400).json({ error: "Webhook signature check failed" });
      return;
    }
  }

  try {
    const event = req.body as {
      event_type: string;
      resource: {
        id: string;
        custom_id?: string;
        status?: string;
        plan_id?: string;
      };
    };

    const { event_type, resource } = event;
    const userId = resource.custom_id;
    const subscriptionId = resource.id;

    if (!userId) { res.status(200).json({ received: true }); return; }

    const now = new Date();

    switch (event_type) {
      case "BILLING.SUBSCRIPTION.RENEWED":
      case "PAYMENT.SALE.COMPLETED":
        await db.update(userPlansTable)
          .set({ plan: "premium", status: "active", updatedAt: now })
          .where(eq(userPlansTable.userId, userId));
        await db.insert(analyticsEventsTable).values({
          event: "paypal_subscription_renewed",
          userId,
          properties: { subscriptionId, event_type },
        }).catch(() => {});
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        await db.update(userPlansTable)
          .set({ status: "cancelled", updatedAt: now })
          .where(eq(userPlansTable.userId, userId));
        await db.insert(analyticsEventsTable).values({
          event: "paypal_subscription_cancelled",
          userId,
          properties: { subscriptionId, event_type },
        }).catch(() => {});
        break;

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await db.update(userPlansTable)
          .set({ plan: "free", status: "expired", updatedAt: now })
          .where(eq(userPlansTable.userId, userId));
        await db.insert(analyticsEventsTable).values({
          event: "paypal_subscription_expired",
          userId,
          properties: { subscriptionId, event_type },
        }).catch(() => {});
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/paypal/config ────────────────────────────────────────────────────
// Returns the PayPal client ID (public) for the frontend SDK.
router.get("/paypal/config", (_req, res): void => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) { res.status(503).json({ error: "PayPal not configured" }); return; }
  res.json({ clientId, currency: "USD", priceUsd: FOUNDING_MOMS_PRICE_USD });
});

export default router;
