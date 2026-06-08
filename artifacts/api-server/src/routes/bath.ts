import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, bathEntriesTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

// GET /bath — list bath entries for a twin, optionally filtered by date
router.get("/", async (req, res): Promise<void> => {
  const twinId = Number(req.query.twinId);
  if (!twinId || isNaN(twinId)) {
    res.status(400).json({ error: "twinId is required" });
    return;
  }

  const date = req.query.date as string | undefined;

  let rows;
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    rows = await db
      .select()
      .from(bathEntriesTable)
      .where(
        and(
          eq(bathEntriesTable.twinId, twinId),
          gte(bathEntriesTable.notedAt, start),
          lt(bathEntriesTable.notedAt, new Date(end.getTime() + 1)),
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

  res.json(
    rows.map((r) => ({
      id: r.id,
      twinId: r.twinId,
      notedAt: r.notedAt.toISOString(),
      notes: r.notes ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
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

  res.status(201).json({
    id: row.id,
    twinId: row.twinId,
    notedAt: row.notedAt.toISOString(),
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  });
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
