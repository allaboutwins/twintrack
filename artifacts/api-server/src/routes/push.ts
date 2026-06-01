import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import webpush from "web-push";
import { getAuth } from "@clerk/express";
import {
  db,
  pushSubscriptionsTable,
  notificationPrefsTable,
  notificationHistoryTable,
} from "@workspace/db";

const router: IRouter = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@allaboutwins.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Public key ───────────────────────────────────────────────────────────

router.get("/push/vapid-public-key", (_req, res): void => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ── Subscribe ─────────────────────────────────────────────────────────────

router.post("/push/subscribe", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { endpoint, keys, userAgent } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "endpoint, keys.p256dh, and keys.auth are required" });
    return;
  }

  await db
    .insert(pushSubscriptionsTable)
    .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent ?? null })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { userId, p256dh: keys.p256dh, auth: keys.auth, updatedAt: new Date() },
    });

  res.status(201).json({ ok: true });
});

// ── Unsubscribe ───────────────────────────────────────────────────────────

router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) { res.status(400).json({ error: "endpoint required" }); return; }

  await db
    .delete(pushSubscriptionsTable)
    .where(and(eq(pushSubscriptionsTable.userId, userId), eq(pushSubscriptionsTable.endpoint, endpoint)));

  res.json({ ok: true });
});

// ── Notification preferences ──────────────────────────────────────────────

router.get("/notification-prefs", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db.select().from(notificationPrefsTable).where(eq(notificationPrefsTable.userId, userId));
  if (rows.length === 0) {
    res.json({
      userId, feedingReminders: true, sleepReminders: true, pumpingReminders: false,
      medicationReminders: false, milestoneReminders: true, twinAiTips: true,
      weeklyInsights: true, dailyLogReminder: true, feedingIntervalMinutes: 180,
    });
    return;
  }
  res.json(rows[0]);
});

router.put("/notification-prefs", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const {
    feedingReminders, sleepReminders, pumpingReminders, medicationReminders,
    milestoneReminders, twinAiTips, weeklyInsights, dailyLogReminder, feedingIntervalMinutes,
  } = req.body as Partial<{
    feedingReminders: boolean; sleepReminders: boolean; pumpingReminders: boolean;
    medicationReminders: boolean; milestoneReminders: boolean; twinAiTips: boolean;
    weeklyInsights: boolean; dailyLogReminder: boolean; feedingIntervalMinutes: number;
  }>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (feedingReminders != null) updates.feedingReminders = feedingReminders;
  if (sleepReminders != null) updates.sleepReminders = sleepReminders;
  if (pumpingReminders != null) updates.pumpingReminders = pumpingReminders;
  if (medicationReminders != null) updates.medicationReminders = medicationReminders;
  if (milestoneReminders != null) updates.milestoneReminders = milestoneReminders;
  if (twinAiTips != null) updates.twinAiTips = twinAiTips;
  if (weeklyInsights != null) updates.weeklyInsights = weeklyInsights;
  if (dailyLogReminder != null) updates.dailyLogReminder = dailyLogReminder;
  if (feedingIntervalMinutes != null) updates.feedingIntervalMinutes = feedingIntervalMinutes;

  await db
    .insert(notificationPrefsTable)
    .values({ userId, ...updates } as typeof notificationPrefsTable.$inferInsert)
    .onConflictDoUpdate({ target: notificationPrefsTable.userId, set: updates });

  const rows = await db.select().from(notificationPrefsTable).where(eq(notificationPrefsTable.userId, userId));
  res.json(rows[0]);
});

// ── Notification history ──────────────────────────────────────────────────

router.get("/notifications", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
  const rows = await db
    .select()
    .from(notificationHistoryTable)
    .where(eq(notificationHistoryTable.userId, userId))
    .orderBy(desc(notificationHistoryTable.sentAt))
    .limit(limit);

  res.json(rows.map((r) => ({
    ...r,
    sentAt: r.sentAt.toISOString(),
    openedAt: r.openedAt?.toISOString() ?? null,
  })));
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(notificationHistoryTable)
    .set({ isRead: true, openedAt: new Date() })
    .where(and(eq(notificationHistoryTable.id, id), eq(notificationHistoryTable.userId, userId)));

  res.json({ ok: true });
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  await db
    .update(notificationHistoryTable)
    .set({ isRead: true, openedAt: new Date() })
    .where(and(eq(notificationHistoryTable.userId, userId)));

  res.json({ ok: true });
});

// ── Send notification (internal helper, also used by admin test) ──────────

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string; type: string },
): Promise<{ sent: number; failed: number }> {
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  if (subs.length === 0) return { sent: 0, failed: 0 };

  await db.insert(notificationHistoryTable).values({
    userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? null,
    url: payload.url ?? null,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: payload.title, body: payload.body, icon: payload.icon ?? "/icon-192.png", url: payload.url ?? "/" }),
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        }
      }
    }),
  );

  return { sent, failed };
}

// ── Native push token registration (Capacitor FCM/APNs) ──────────────────

router.post("/push/native-subscribe", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { token, platform } = req.body as { token?: string; platform?: string };
  if (!token) { res.status(400).json({ error: "token required" }); return; }

  // Store the native push token using the endpoint field as a namespaced key
  // so it coexists with Web Push subscriptions without a separate table.
  const endpoint = `native:${platform ?? "unknown"}:${token}`;
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId, endpoint, p256dh: "native", auth: "native", userAgent: platform ?? "native" })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { userId, updatedAt: new Date() },
    });

  req.log.info({ userId, platform }, "native push token registered");
  res.status(201).json({ ok: true });
});

// ── Admin: send test notification ─────────────────────────────────────────

router.post("/push/send-test", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const result = await sendPushToUser(userId, {
    type: "test",
    title: "TwinTrack 🍒",
    body: "Notifications are working! You'll never miss a reminder.",
    icon: "/icon-192.png",
    url: "/dashboard",
  });

  res.json(result);
});

// ── Admin: notification analytics ─────────────────────────────────────────

router.get("/admin/notifications/stats", async (_req, res): Promise<void> => {
  const [totalSubs, history] = await Promise.all([
    db.select().from(pushSubscriptionsTable),
    db.select().from(notificationHistoryTable),
  ]);

  const totalSent = history.length;
  const totalOpened = history.filter((n) => n.openedAt !== null).length;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  const byType = history.reduce<Record<string, { sent: number; opened: number }>>((acc, n) => {
    if (!acc[n.type]) acc[n.type] = { sent: 0, opened: 0 };
    acc[n.type].sent++;
    if (n.openedAt) acc[n.type].opened++;
    return acc;
  }, {});

  res.json({
    totalSubscribers: totalSubs.length,
    uniqueSubscribedUsers: new Set(totalSubs.map((s) => s.userId)).size,
    totalSent,
    totalOpened,
    openRate,
    byType,
  });
});

export default router;
