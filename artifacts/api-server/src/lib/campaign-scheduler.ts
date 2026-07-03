/**
 * Campaign email scheduler.
 * On startup, schedules a one-time (and recurring daily) job that sends any
 * pending campaign emails once Resend's daily quota has reset (midnight UTC).
 *
 * Uses the campaign_emails table as the source of truth:
 *   status = "pending"  → not yet sent
 *   status = "sent"     → delivered successfully
 *   status = "failed"   → permanent error (bad address, bounce)
 */

import { eq, and } from "drizzle-orm";
import { db, campaignEmailsTable, analyticsEventsTable } from "@workspace/db";
import { sendCampaignBatch } from "./email.js";
import { getUnsubToken } from "../routes/unsubscribe.js";
import { logger } from "./logger.js";

const APP_URL = process.env.APP_URL ?? "https://app.allaboutwins.com";
const CAMPAIGN_ID = "paypal_announcement_june_2026";

/** ms until next 01:05 UTC (5 min past midnight to let Resend reset fully) */
function msUntilNextSendWindow(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 1, 5, 0),
  );
  return Math.max(next.getTime() - now.getTime(), 60_000);
}

async function runPendingSends(): Promise<void> {
  try {
    const pending = await db
      .select()
      .from(campaignEmailsTable)
      .where(and(
        eq(campaignEmailsTable.campaignId, CAMPAIGN_ID),
        eq(campaignEmailsTable.status, "pending"),
      ));

    if (pending.length === 0) {
      logger.info({ campaign: CAMPAIGN_ID }, "campaign-scheduler: no pending emails");
      return;
    }

    logger.info({ campaign: CAMPAIGN_ID, count: pending.length }, "campaign-scheduler: sending pending emails");

    const entries = pending.map(row => ({
      email: row.email,
      unsubUrl: `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(row.email)}&token=${getUnsubToken(row.email)}`,
    }));

    const results = await sendCampaignBatch(entries, APP_URL);

    for (const result of results) {
      const newStatus = result.ok ? "sent" : "failed";
      await db
        .update(campaignEmailsTable)
        .set({ status: newStatus, sentAt: result.ok ? new Date() : undefined })
        .where(and(
          eq(campaignEmailsTable.email, result.email),
          eq(campaignEmailsTable.campaignId, CAMPAIGN_ID),
        ));

      if (result.ok) {
        await db.insert(analyticsEventsTable).values({
          event: "campaign_announcement_june_2026",
          properties: { email: result.email, resendId: result.id, source: "scheduler" },
        }).catch(() => {});
      }
    }

    const sent = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    logger.info({ campaign: CAMPAIGN_ID, sent, failed }, "campaign-scheduler: run complete");
  } catch (err) {
    logger.error({ err, campaign: CAMPAIGN_ID }, "campaign-scheduler: error during send");
  }
}

/**
 * Call once at server startup. Schedules the first run at the next 01:05 UTC,
 * then repeats every 24 hours until all pending emails are exhausted.
 */
export function startCampaignScheduler(): void {
  const delay = msUntilNextSendWindow();
  const hoursUntil = (delay / 3_600_000).toFixed(1);
  logger.info({ hoursUntil, campaign: CAMPAIGN_ID }, "campaign-scheduler: first run scheduled");

  const scheduleNext = () => {
    const nextDelay = msUntilNextSendWindow();
    setTimeout(async () => {
      await runPendingSends();
      scheduleNext();
    }, nextDelay);
  };

  setTimeout(async () => {
    await runPendingSends();
    scheduleNext();
  }, delay);
}
