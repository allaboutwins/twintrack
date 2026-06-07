import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userPlansTable, analyticsEventsTable } from "@workspace/db";

const router: IRouter = Router();

const FOUNDING_PRODUCT_ID = "twintrack_founding_annual";
const MONTHLY_PRODUCT_ID = "twintrack_premium_monthly";

type RcEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "BILLING_ISSUE"
  | "EXPIRATION"
  | "UNCANCELLATION"
  | "SUBSCRIBER_ALIAS"
  | "TRANSFER"
  | "NON_RENEWING_PURCHASE";

interface RcEvent {
  type: RcEventType;
  app_user_id: string;
  aliases?: string[];
  product_id?: string;
  entitlement_ids?: string[];
  transaction_id?: string;
  expiration_at_ms?: number;
  cancel_reason?: string;
  currency?: string;
  price?: number;
  price_in_purchased_currency?: number;
  environment?: string;
}

interface RcWebhookBody {
  api_version?: string;
  event: RcEvent;
}

function verifyWebhookSecret(authHeader: string | undefined): boolean {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) return true;
  return authHeader === webhookSecret;
}

router.post("/webhooks/revenuecat", async (req, res): Promise<void> => {
  const authHeader = req.headers["authorization"] as string | undefined;
  if (!verifyWebhookSecret(authHeader)) {
    req.log.warn({ event: "revenuecat_webhook_unauthorized" }, "RevenueCat webhook: unauthorized");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as RcWebhookBody;
  const event = body?.event;

  if (!event?.type || !event?.app_user_id) {
    req.log.warn({ body }, "RevenueCat webhook: missing event fields");
    res.status(400).json({ error: "Missing event fields" });
    return;
  }

  const userId = event.app_user_id;
  const eventType = event.type;
  const productId = event.product_id ?? "";
  const environment = event.environment ?? "production";

  req.log.info(
    { event: "revenuecat_webhook", userId, eventType, productId, environment },
    "RevenueCat webhook received",
  );

  await db
    .insert(analyticsEventsTable)
    .values({
      event: `revenuecat_${eventType.toLowerCase()}`,
      userId,
      properties: {
        productId,
        transactionId: event.transaction_id,
        environment,
        entitlementIds: event.entitlement_ids ?? [],
      },
    })
    .catch(() => {});

  try {
    switch (eventType) {
      case "INITIAL_PURCHASE": {
        const isFoundingMom = productId === FOUNDING_PRODUCT_ID;
        const isMonthly = productId === MONTHLY_PRODUCT_ID;
        await db
          .update(userPlansTable)
          .set({
            plan: "premium",
            status: "active",
            isFoundingMom,
            foundingPriceCents: isFoundingMom ? 3900 : null,
            billingSource: "revenuecat",
            externalSubscriptionId: event.transaction_id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(userPlansTable.userId, userId));

        req.log.info(
          { userId, productId, isFoundingMom, isMonthly },
          "RevenueCat: initial purchase — plan set to premium",
        );
        break;
      }

      case "RENEWAL": {
        await db
          .update(userPlansTable)
          .set({
            plan: "premium",
            status: "active",
            billingSource: "revenuecat",
            updatedAt: new Date(),
          })
          .where(eq(userPlansTable.userId, userId));

        req.log.info({ userId, productId }, "RevenueCat: renewal — plan remains active");
        break;
      }

      case "UNCANCELLATION": {
        await db
          .update(userPlansTable)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(userPlansTable.userId, userId));

        req.log.info({ userId }, "RevenueCat: uncancellation — plan reactivated");
        break;
      }

      case "CANCELLATION": {
        await db
          .update(userPlansTable)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(userPlansTable.userId, userId));

        req.log.info(
          { userId, cancelReason: event.cancel_reason },
          "RevenueCat: cancellation — plan marked cancelled (access until expiry)",
        );
        break;
      }

      case "BILLING_ISSUE": {
        await db
          .update(userPlansTable)
          .set({ status: "billing_issue", updatedAt: new Date() })
          .where(eq(userPlansTable.userId, userId));

        req.log.warn({ userId }, "RevenueCat: billing issue");
        break;
      }

      case "EXPIRATION": {
        await db
          .update(userPlansTable)
          .set({ plan: "free", status: "expired", updatedAt: new Date() })
          .where(eq(userPlansTable.userId, userId));

        req.log.info({ userId }, "RevenueCat: subscription expired — plan reverted to free");
        break;
      }

      default:
        req.log.info({ eventType }, "RevenueCat webhook: unhandled event type");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err, userId, eventType }, "RevenueCat webhook: error processing event");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
