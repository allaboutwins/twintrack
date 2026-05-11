import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, feedbackTable } from "@workspace/db";
import { SubmitFeedbackBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/feedback", async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [feedback] = await db.insert(feedbackTable).values(parsed.data).returning();
  res.status(201).json(feedback);
});

router.patch("/feedback/:id/star", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const userId = req.query.userId as string | undefined;
  if (!isAdminId(userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [existing] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(feedbackTable).set({ isStarred: !existing.isStarred }).where(eq(feedbackTable.id, id)).returning();
  res.json(updated);
});

router.patch("/feedback/:id/resolve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const userId = req.query.userId as string | undefined;
  if (!isAdminId(userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [existing] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(feedbackTable).set({ isResolved: !existing.isResolved }).where(eq(feedbackTable.id, id)).returning();
  res.json(updated);
});

function isAdminId(userId: string | undefined): boolean {
  if (!userId) return false;
  return (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean).includes(userId);
}

export default router;
