import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, feedingEntriesTable, foodsIntroducedTable } from "@workspace/db";
import {
  CreateFeedingEntryBody,
  UpdateFeedingEntryParams,
  UpdateFeedingEntryBody,
  DeleteFeedingEntryParams,
  ListFeedingEntriesQueryParams,
  GetFeedingSummaryQueryParams,
  CreateFoodIntroducedBody,
  DeleteFoodIntroducedParams,
  ListFoodsIntroducedQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getDayBoundsUTC(date: string, timezone?: string | null): { dayStart: Date; dayEnd: Date } {
  if (!timezone) {
    return {
      dayStart: new Date(`${date}T00:00:00Z`),
      dayEnd: new Date(`${date}T23:59:59Z`),
    };
  }
  try {
    const noonUTC = new Date(`${date}T12:00:00Z`);
    const localStr = noonUTC.toLocaleString("en-CA", { timeZone: timezone, hour12: false });
    const localNoon = new Date(localStr.replace(", ", "T") + "Z");
    const offsetMs = noonUTC.getTime() - localNoon.getTime();
    const dayStartMs = new Date(`${date}T00:00:00Z`).getTime() + offsetMs;
    return {
      dayStart: new Date(dayStartMs),
      dayEnd: new Date(dayStartMs + 24 * 3600 * 1000 - 1000),
    };
  } catch {
    return {
      dayStart: new Date(`${date}T00:00:00Z`),
      dayEnd: new Date(`${date}T23:59:59Z`),
    };
  }
}

function serializeEntry(e: typeof feedingEntriesTable.$inferSelect) {
  return {
    ...e,
    time: e.time.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

// ── FEEDING ─────────────────────────────────────────────────────────────────

router.get("/feeding/summary", async (req, res): Promise<void> => {
  const parsed = GetFeedingSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date, timezone } = parsed.data as typeof parsed.data & { timezone?: string | null };
  const { dayStart, dayEnd } = getDayBoundsUTC(date, timezone as string | null | undefined);

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

  const totalAmountMl = entries.reduce((sum, e) => sum + (e.amountMl ?? 0), 0);
  const totalDurationMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  res.json({
    twinId,
    date,
    totalFeedings: entries.length,
    breastfeedingCount: entries.filter((e) => e.feedingType === "breastfeeding").length,
    bottleCount: entries.filter((e) => e.feedingType === "bottle").length,
    formulaCount: entries.filter((e) => e.feedingType === "formula").length,
    solidsCount: entries.filter((e) => e.feedingType === "solids").length,
    totalAmountMl,
    totalDurationMinutes,
  });
});

router.get("/feeding", async (req, res): Promise<void> => {
  const parsed = ListFeedingEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date, timezone } = parsed.data as typeof parsed.data & { timezone?: string | null };
  const conditions = [eq(feedingEntriesTable.twinId, twinId)];
  if (date) {
    const { dayStart, dayEnd } = getDayBoundsUTC(date, timezone as string | null | undefined);
    conditions.push(gte(feedingEntriesTable.time, dayStart));
    conditions.push(lte(feedingEntriesTable.time, dayEnd));
  }
  const entries = await db
    .select()
    .from(feedingEntriesTable)
    .where(and(...conditions))
    .orderBy(feedingEntriesTable.time);

  res.json(entries.map(serializeEntry));
});

router.post("/feeding", async (req, res): Promise<void> => {
  const parsed = CreateFeedingEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [entry] = await db
    .insert(feedingEntriesTable)
    .values({
      twinId: d.twinId,
      feedingType: d.feedingType,
      side: d.side ?? null,
      durationMinutes: d.durationMinutes ?? null,
      amountMl: d.amountMl ?? null,
      foodName: d.foodName ?? null,
      time: new Date(d.time),
      quantity: d.quantity ?? null,
      notes: d.notes ?? null,
    })
    .returning();
  res.status(201).json(serializeEntry(entry));
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
  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.feedingType != null) updates.feedingType = d.feedingType;
  if (d.time != null) updates.time = new Date(d.time);
  if (d.side !== undefined) updates.side = d.side;
  if (d.durationMinutes !== undefined) updates.durationMinutes = d.durationMinutes;
  if (d.amountMl !== undefined) updates.amountMl = d.amountMl;
  if (d.foodName !== undefined) updates.foodName = d.foodName;
  if (d.quantity !== undefined) updates.quantity = d.quantity;
  if (d.notes !== undefined) updates.notes = d.notes;

  const [entry] = await db
    .update(feedingEntriesTable)
    .set(updates)
    .where(eq(feedingEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Feeding entry not found" });
    return;
  }
  res.json(serializeEntry(entry));
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

// ── FOODS INTRODUCED ────────────────────────────────────────────────────────

router.get("/foods-introduced", async (req, res): Promise<void> => {
  const parsed = ListFoodsIntroducedQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "twinId is required" });
    return;
  }
  const foods = await db
    .select()
    .from(foodsIntroducedTable)
    .where(eq(foodsIntroducedTable.twinId, parsed.data.twinId))
    .orderBy(desc(foodsIntroducedTable.firstIntroduced));

  res.json(foods.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })));
});

router.post("/foods-introduced", async (req, res): Promise<void> => {
  const parsed = CreateFoodIntroducedBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [food] = await db
    .insert(foodsIntroducedTable)
    .values({
      twinId: d.twinId,
      foodName: d.foodName,
      category: d.category,
      firstIntroduced: d.firstIntroduced,
      reaction: d.reaction ?? null,
      notes: d.notes ?? null,
    })
    .returning();
  res.status(201).json({ ...food, createdAt: food.createdAt.toISOString() });
});

router.delete("/foods-introduced/:id", async (req, res): Promise<void> => {
  const params = DeleteFoodIntroducedParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [food] = await db
    .delete(foodsIntroducedTable)
    .where(eq(foodsIntroducedTable.id, params.data.id))
    .returning();
  if (!food) {
    res.status(404).json({ error: "Food record not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
