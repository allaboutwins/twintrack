import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, bathEntriesTable } from "@workspace/db";
import { z } from "zod/v4";

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

function serializeRow(r: typeof bathEntriesTable.$inferSelect) {
  return {
    id: r.id,
    twinId: r.twinId,
    notedAt: r.notedAt.toISOString(),
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

// GET /bath — list bath entries for a twin, optionally filtered by date
router.get("/", async (req, res): Promise<void> => {
  const twinId = Number(req.query.twinId);
  if (!twinId || isNaN(twinId)) {
    res.status(400).json({ error: "twinId is required" });
    return;
  }

  const date = req.query.date as string | undefined;
  const timezone = req.query.timezone as string | undefined;

  let rows;
  if (date) {
    const { dayStart, dayEnd } = getDayBoundsUTC(date, timezone);
    rows = await db
      .select()
      .from(bathEntriesTable)
      .where(
        and(
          eq(bathEntriesTable.twinId, twinId),
          gte(bathEntriesTable.notedAt, dayStart),
          lte(bathEntriesTable.notedAt, dayEnd),
        ),
      )
      .orderBy(bathEntriesTable.notedAt);
  } else {
    rows = await db
      .select()
      .from(bathEntriesTable)
      .where(eq(bathEntriesTable.twinId, twinId))
      .orderBy(bathEntriesTable.notedAt);
  }

  res.json(rows.map(serializeRow));
});

// POST /bath — log a bath
router.post("/", async (req, res): Promise<void> => {
  const parsed = z
    .object({
      twinId: z.number().int().positive(),
      notedAt: z.string(),
      notes: z.string().nullable().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(bathEntriesTable)
    .values({
      twinId: parsed.data.twinId,
      notedAt: new Date(parsed.data.notedAt),
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(serializeRow(row));
});

// PATCH /bath/:id — update a bath entry (e.g. move to other twin)
router.patch("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = z
    .object({
      twinId: z.number().int().positive().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.twinId != null) updates.twinId = parsed.data.twinId;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updates provided" });
    return;
  }

  const [row] = await db
    .update(bathEntriesTable)
    .set(updates)
    .where(eq(bathEntriesTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Bath entry not found" });
    return;
  }

  res.json(serializeRow(row));
});

// DELETE /bath/:id
router.delete("/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(bathEntriesTable).where(eq(bathEntriesTable.id, id));
  res.status(204).send();
});

export default router;
