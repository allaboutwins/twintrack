import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, feedingEntriesTable } from "@workspace/db";
import {
  CreateFeedingEntryBody,
  UpdateFeedingEntryParams,
  UpdateFeedingEntryBody,
  DeleteFeedingEntryParams,
  ListFeedingEntriesQueryParams,
  GetFeedingSummaryQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feeding/summary", async (req, res): Promise<void> => {
  const parsed = GetFeedingSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date } = parsed.data;
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const entries = await db
    .select()
    .from(feedingEntriesTable)
    .where(
      and(
        eq(feedingEntriesTable.twinId, twinId),
        gte(feedingEntriesTable.time, dayStart),
        lte(feedingEntriesTable.time, dayEnd),
      ),
    );

  res.json({
    twinId,
    date,
    totalFeedings: entries.length,
    breastfeedingCount: entries.filter((e) => e.feedingType === "breastfeeding").length,
    bottleCount: entries.filter((e) => e.feedingType === "bottle").length,
    formulaCount: entries.filter((e) => e.feedingType === "formula").length,
    solidsCount: entries.filter((e) => e.feedingType === "solids").length,
  });
});

router.get("/feeding", async (req, res): Promise<void> => {
  const parsed = ListFeedingEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date } = parsed.data;
  const conditions = [eq(feedingEntriesTable.twinId, twinId)];
  if (date) {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    conditions.push(gte(feedingEntriesTable.time, dayStart));
    conditions.push(lte(feedingEntriesTable.time, dayEnd));
  }
  const entries = await db
    .select()
    .from(feedingEntriesTable)
    .where(and(...conditions))
    .orderBy(feedingEntriesTable.time);

  res.json(
    entries.map((e) => ({
      ...e,
      time: e.time.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/feeding", async (req, res): Promise<void> => {
  const parsed = CreateFeedingEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(feedingEntriesTable)
    .values({
      twinId: parsed.data.twinId,
      feedingType: parsed.data.feedingType,
      time: new Date(parsed.data.time),
      quantity: parsed.data.quantity ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.status(201).json({
    ...entry,
    time: entry.time.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  });
});

router.patch("/feeding/:id", async (req, res): Promise<void> => {
  const params = UpdateFeedingEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFeedingEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.feedingType != null) updates.feedingType = parsed.data.feedingType;
  if (parsed.data.time != null) updates.time = new Date(parsed.data.time);
  if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [entry] = await db
    .update(feedingEntriesTable)
    .set(updates)
    .where(eq(feedingEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Feeding entry not found" });
    return;
  }
  res.json({
    ...entry,
    time: entry.time.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  });
});

router.delete("/feeding/:id", async (req, res): Promise<void> => {
  const params = DeleteFeedingEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(feedingEntriesTable).where(eq(feedingEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Feeding entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
