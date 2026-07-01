import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
import { db, pumpEntriesTable, pumpRemindersTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

const StartSessionBody = z.object({
  side: z.enum(["left", "right", "both"]).optional(),
  startedAt: z.string().optional(),
});

const StopSessionBody = z.object({
  endedAt: z.string().optional(),
  amountMl: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const ManualEntryBody = z.object({
  startedAt: z.string(),
  durationMinutes: z.number().int().min(1).max(180),
  amountMl: z.number().min(0).optional(),
  side: z.enum(["left", "right", "both"]).optional(),
  notes: z.string().max(500).optional(),
});

const ReminderBody = z.object({
  intervalHours: z.number().min(0.5).max(12),
  isEnabled: z.boolean(),
});

router.get("/pump", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];
  const from = new Date(`${date}T00:00:00.000Z`);
  const to   = new Date(`${date}T23:59:59.999Z`);

  const entries = await db
    .select()
    .from(pumpEntriesTable)
    .where(and(
      eq(pumpEntriesTable.userId, userId),
      gte(pumpEntriesTable.startedAt, from),
      lte(pumpEntriesTable.startedAt, to),
    ))
    .orderBy(desc(pumpEntriesTable.startedAt));

  const active = await db
    .select()
    .from(pumpEntriesTable)
    .where(and(
      eq(pumpEntriesTable.userId, userId),
      isNull(pumpEntriesTable.endedAt),
    ))
    .orderBy(desc(pumpEntriesTable.startedAt))
    .limit(1);

  const totalMl = entries.reduce((s, e) => s + (e.amountMl ?? 0), 0);
  const totalMinutes = entries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);

  res.json({ entries, activeSession: active[0] ?? null, summary: { totalMl, totalMinutes, sessionCount: entries.length } });
});

router.post("/pump/start", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db
    .select()
    .from(pumpEntriesTable)
    .where(and(eq(pumpEntriesTable.userId, userId), isNull(pumpEntriesTable.endedAt)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "A pumping session is already in progress", activeSession: existing[0] });
    return;
  }

  const [entry] = await db.insert(pumpEntriesTable).values({
    userId,
    startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
    side: parsed.data.side,
  }).returning();

  res.status(201).json(entry);
});

router.post("/pump/:id/stop", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = StopSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(pumpEntriesTable)
    .where(and(eq(pumpEntriesTable.id, id), eq(pumpEntriesTable.userId, userId)));

  if (!existing) { res.status(404).json({ error: "Session not found" }); return; }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date();
  const durationMinutes = Math.round((endedAt.getTime() - existing.startedAt.getTime()) / 60000);

  const [updated] = await db
    .update(pumpEntriesTable)
    .set({ endedAt, durationMinutes, amountMl: parsed.data.amountMl, notes: parsed.data.notes })
    .where(eq(pumpEntriesTable.id, id))
    .returning();

  res.json(updated);
});

router.post("/pump/manual", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = ManualEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const startedAt = new Date(parsed.data.startedAt);
  const endedAt = new Date(startedAt.getTime() + parsed.data.durationMinutes * 60000);

  const [entry] = await db.insert(pumpEntriesTable).values({
    userId,
    startedAt,
    endedAt,
    durationMinutes: parsed.data.durationMinutes,
    amountMl: parsed.data.amountMl,
    side: parsed.data.side,
    notes: parsed.data.notes,
  }).returning();

  res.status(201).json(entry);
});

router.delete("/pump/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(pumpEntriesTable)
    .where(and(eq(pumpEntriesTable.id, id), eq(pumpEntriesTable.userId, userId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Entry not found" }); return; }
  res.status(204).send();
});

router.get("/pump/reminder", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [reminder] = await db
    .select()
    .from(pumpRemindersTable)
    .where(eq(pumpRemindersTable.userId, userId));

  res.json(reminder ?? { intervalHours: 3, isEnabled: false, nextReminderAt: null });
});

router.put("/pump/reminder", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = ReminderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const nextReminderAt = parsed.data.isEnabled
    ? new Date(Date.now() + parsed.data.intervalHours * 3600000)
    : null;

  const [upserted] = await db
    .insert(pumpRemindersTable)
    .values({ userId, ...parsed.data, nextReminderAt, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: pumpRemindersTable.userId,
      set: { ...parsed.data, nextReminderAt, updatedAt: new Date() },
    })
    .returning();

  res.json(upserted);
});

export default router;
