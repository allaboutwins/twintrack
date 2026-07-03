import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, communityQuestions, communityAnswers, communityAnswerLikes } from "@workspace/db";
import { z } from "zod/v4";
import { isAdminAuth } from "./admin-auth";

const router: IRouter = Router();

// GET /community/questions — list published questions with answers
router.get("/community/questions", async (_req, res): Promise<void> => {
  const questions = await db
    .select()
    .from(communityQuestions)
    .where(eq(communityQuestions.status, "published"))
    .orderBy(desc(communityQuestions.createdAt))
    .limit(50);

  const withAnswers = await Promise.all(
    questions.map(async (q) => {
      const answers = await db
        .select()
        .from(communityAnswers)
        .where(eq(communityAnswers.questionId, q.id))
        .orderBy(desc(communityAnswers.isPinned), desc(communityAnswers.likes))
        .limit(10);
      return { ...q, answers };
    }),
  );

  res.json(withAnswers);
});

// GET /community/questions/latest — newest published question (lightweight, for Home)
router.get("/community/questions/latest", async (_req, res): Promise<void> => {
  const [question] = await db
    .select()
    .from(communityQuestions)
    .where(eq(communityQuestions.status, "published"))
    .orderBy(desc(communityQuestions.createdAt))
    .limit(1);

  res.json(question ?? null);
});

// POST /community/questions — submit a question (requires approval)
router.post("/community/questions", async (req, res): Promise<void> => {
  const parsed = z
    .object({
      userId: z.string().optional(),
      question: z.string().min(5).max(500),
      authorName: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(communityQuestions)
    .values({ ...parsed.data, status: "pending" })
    .returning();
  res.status(201).json(row);
});

// POST /community/questions/:id/answers — submit an answer
router.post("/community/questions/:id/answers", async (req, res): Promise<void> => {
  const questionId = Number(req.params.id);
  if (isNaN(questionId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z
    .object({
      userId: z.string().optional(),
      answerText: z.string().min(2).max(2000),
      authorName: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(communityAnswers)
    .values({ questionId, ...parsed.data })
    .returning();
  res.status(201).json(row);
});

// POST /community/answers/:id/like — toggle like on an answer
router.post("/community/answers/:id/like", async (req, res): Promise<void> => {
  const answerId = Number(req.params.id);
  const { userId } = z.object({ userId: z.string() }).safeParse(req.body).data ?? {};
  if (isNaN(answerId) || !userId) { res.status(400).json({ error: "Invalid params" }); return; }

  const existing = await db
    .select()
    .from(communityAnswerLikes)
    .where(and(eq(communityAnswerLikes.answerId, answerId), eq(communityAnswerLikes.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Unlike
    await db.delete(communityAnswerLikes).where(and(eq(communityAnswerLikes.answerId, answerId), eq(communityAnswerLikes.userId, userId)));
    await db.update(communityAnswers).set({ likes: Math.max(0, (existing[0].answerId) - 1) }).where(eq(communityAnswers.id, answerId));
    res.json({ liked: false });
  } else {
    // Like
    await db.insert(communityAnswerLikes).values({ answerId, userId });
    const [answer] = await db.select().from(communityAnswers).where(eq(communityAnswers.id, answerId)).limit(1);
    if (answer) {
      await db.update(communityAnswers).set({ likes: answer.likes + 1 }).where(eq(communityAnswers.id, answerId));
    }
    res.json({ liked: true });
  }
});

// ── Admin endpoints ───────────────────────────────────────────────────────

// GET /admin/community/questions — all questions (all statuses)
router.get("/admin/community/questions", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  const questions = await db
    .select()
    .from(communityQuestions)
    .orderBy(desc(communityQuestions.createdAt))
    .limit(200);
  res.json(questions);
});

// PATCH /admin/community/questions/:id — update status / pin answer
router.patch("/admin/community/questions/:id", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = z
    .object({
      status: z.enum(["pending", "published", "rejected"]).optional(),
      pinnedAnswerId: z.number().optional(),
      isAdminAdded: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(communityQuestions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(communityQuestions.id, id))
    .returning();
  res.json(row);
});

// POST /admin/community/questions — admin adds a question directly (published)
router.post("/admin/community/questions", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  const parsed = z
    .object({
      question: z.string().min(5).max(500),
      authorName: z.string().optional().default("TwinTrack Community"),
    })
    .safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(communityQuestions)
    .values({ ...parsed.data, status: "published", isAdminAdded: true })
    .returning();
  res.status(201).json(row);
});

// PATCH /admin/community/answers/:id/pin — pin/unpin an answer
router.patch("/admin/community/answers/:id/pin", async (req, res): Promise<void> => {
  if (!isAdminAuth(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isPinned } = z.object({ isPinned: z.boolean() }).safeParse(req.body).data ?? { isPinned: false };
  const [row] = await db
    .update(communityAnswers)
    .set({ isPinned })
    .where(eq(communityAnswers.id, id))
    .returning();
  res.json(row);
});

export default router;
