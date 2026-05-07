import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, milestonesTable } from "@workspace/db";
import {
  CreateMilestoneBody,
  ListMilestonesQueryParams,
  DeleteMilestoneParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/milestones", async (req, res): Promise<void> => {
  const parsed = ListMilestonesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [eq(milestonesTable.userId, parsed.data.userId)];
  if (parsed.data.twinId) {
    conditions.push(eq(milestonesTable.twinId, parsed.data.twinId));
  }
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(and(...conditions))
    .orderBy(milestonesTable.achievedDate);
  res.json(milestones.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/milestones", async (req, res): Promise<void> => {
  const parsed = CreateMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [milestone] = await db
    .insert(milestonesTable)
    .values({
      userId: parsed.data.userId,
      twinId: parsed.data.twinId,
      category: parsed.data.category,
      title: parsed.data.title,
      achievedDate: parsed.data.achievedDate,
      photoUrl: parsed.data.photoUrl ?? null,
      note: parsed.data.note ?? null,
    })
    .returning();
  res.status(201).json({ ...milestone, createdAt: milestone.createdAt.toISOString() });
});

router.delete("/milestones/:id", async (req, res): Promise<void> => {
  const parsed = DeleteMilestoneParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.delete(milestonesTable).where(eq(milestonesTable.id, parsed.data.id));
  res.json({ deleted: true });
});

export default router;
