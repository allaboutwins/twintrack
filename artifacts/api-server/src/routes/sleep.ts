import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, sleepEntriesTable } from "@workspace/db";
import {
  CreateSleepEntryBody,
  UpdateSleepEntryParams,
  UpdateSleepEntryBody,
  DeleteSleepEntryParams,
  ListSleepEntriesQueryParams,
  GetSleepSummaryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sleep/summary", async (req, res): Promise<void> => {
  const parsed = GetSleepSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date } = parsed.data;
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const dailyEntries = await db
    .select()
    .from(sleepEntriesTable)
    .where(
      and(
        eq(sleepEntriesTable.twinId, twinId),
        gte(sleepEntriesTable.startTime, dayStart),
        lte(sleepEntriesTable.startTime, dayEnd),
      ),
    );

  const weeklyEntries = await db
    .select()
    .from(sleepEntriesTable)
    .where(
      and(
        eq(sleepEntriesTable.twinId, twinId),
        gte(sleepEntriesTable.startTime, weekStart),
        lte(sleepEntriesTable.startTime, dayEnd),
      ),
    );

  const dailyTotalMinutes = dailyEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  const weeklyTotalMinutes = weeklyEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  const napCount = dailyEntries.filter((e) => e.type === "nap").length;
  const nightSleepMinutes = dailyEntries
    .filter((e) => e.type === "night")
    .reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  res.json({ twinId, date, dailyTotalMinutes, weeklyTotalMinutes, napCount, nightSleepMinutes });
});

router.get("/sleep", async (req, res): Promise<void> => {
  const parsed = ListSleepEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date } = parsed.data;
  const conditions = [eq(sleepEntriesTable.twinId, twinId)];
  if (date) {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    conditions.push(gte(sleepEntriesTable.startTime, dayStart));
    conditions.push(lte(sleepEntriesTable.startTime, dayEnd));
  }
  const entries = await db
    .select()
    .from(sleepEntriesTable)
    .where(and(...conditions))
    .orderBy(sleepEntriesTable.startTime);

  res.json(
    entries.map((e) => ({
      ...e,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime ? e.endTime.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/sleep", async (req, res): Promise<void> => {
  const parsed = CreateSleepEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [entry] = await db
    .insert(sleepEntriesTable)
    .values({
      twinId: data.twinId,
      type: data.type,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      durationMinutes: data.durationMinutes ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  res.status(201).json({
    ...entry,
    startTime: entry.startTime.toISOString(),
    endTime: entry.endTime ? entry.endTime.toISOString() : null,
    createdAt: entry.createdAt.toISOString(),
  });
});

router.patch("/sleep/:id", async (req, res): Promise<void> => {
  const params = UpdateSleepEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSleepEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.endTime !== undefined) {
    updates.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null;
  }
  if (parsed.data.durationMinutes !== undefined) updates.durationMinutes = parsed.data.durationMinutes;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [entry] = await db
    .update(sleepEntriesTable)
    .set(updates)
    .where(eq(sleepEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Sleep entry not found" });
    return;
  }
  res.json({
    ...entry,
    startTime: entry.startTime.toISOString(),
    endTime: entry.endTime ? entry.endTime.toISOString() : null,
    createdAt: entry.createdAt.toISOString(),
  });
});

router.delete("/sleep/:id", async (req, res): Promise<void> => {
  const params = DeleteSleepEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(sleepEntriesTable).where(eq(sleepEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Sleep entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
