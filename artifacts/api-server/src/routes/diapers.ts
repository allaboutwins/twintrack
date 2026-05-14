import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, diaperEntriesTable } from "@workspace/db";
import {
  CreateDiaperEntryBody,
  UpdateDiaperEntryBody,
  UpdateDiaperEntryParams,
  DeleteDiaperEntryParams,
  ListDiaperEntriesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/diapers", async (req, res): Promise<void> => {
  const parsed = ListDiaperEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { twinId, date } = parsed.data;
  const conditions = [eq(diaperEntriesTable.twinId, twinId)];
  if (date) {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    conditions.push(gte(diaperEntriesTable.time, dayStart));
    conditions.push(lte(diaperEntriesTable.time, dayEnd));
  }
  const entries = await db
    .select()
    .from(diaperEntriesTable)
    .where(and(...conditions))
    .orderBy(diaperEntriesTable.time);

  res.json(
    entries.map((e) => ({
      ...e,
      time: e.time.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/diapers", async (req, res): Promise<void> => {
  const parsed = CreateDiaperEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db
    .insert(diaperEntriesTable)
    .values({
      twinId: parsed.data.twinId,
      type: parsed.data.type,
      time: new Date(parsed.data.time),
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.status(201).json({
    ...entry,
    time: entry.time.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  });
});

router.patch("/diapers/:id", async (req, res): Promise<void> => {
  const params = UpdateDiaperEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDiaperEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.type != null) updates.type = parsed.data.type;
  if (parsed.data.time != null) updates.time = new Date(parsed.data.time);
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [entry] = await db
    .update(diaperEntriesTable)
    .set(updates)
    .where(eq(diaperEntriesTable.id, params.data.id))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Diaper entry not found" });
    return;
  }
  res.json({
    ...entry,
    time: entry.time.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  });
});

router.delete("/diapers/:id", async (req, res): Promise<void> => {
  const params = DeleteDiaperEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(diaperEntriesTable).where(eq(diaperEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Diaper entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
