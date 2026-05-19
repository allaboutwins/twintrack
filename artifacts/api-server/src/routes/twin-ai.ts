import { Router } from "express";
import { z } from "zod";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, twinAiMessages } from "@workspace/db";

const DAILY_LIMIT = 10;

const router = Router();

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function isAdminAuth(req: Request): boolean {
  const userId = req.query.userId as string | undefined;
  const adminPassword = req.query.adminPassword as string | undefined;
  if (userId && getAdminIds().includes(userId)) return true;
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && adminPassword && adminPassword === envPw) return true;
  return false;
}

const TwinAiMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const TwinAiChatRequestSchema = z.object({
  messages: z.array(TwinAiMessageSchema).min(1),
  category: z.string().nullish(),
});

const TwinAiFeedbackSchema = z.object({
  helpful: z.boolean(),
});

const TWIN_AI_SYSTEM_PROMPT = `You are Twin AI — a warm, knowledgeable, and emotionally supportive companion designed exclusively for parents of twins and multiples.

You are part of TwinTrack, a mobile app built for twin families. Think of yourself as a caring, experienced twin mom friend who has been through it all — sleepless nights, tandem feeding, NICU journeys, and the beautiful chaos of raising two (or more) babies at once.

WHO YOU HELP:
- Twin moms and dads (newborns through toddlers)
- NICU families and preemie parents
- Triplets and quadruplets families
- Single parents of multiples
- Exhausted caregivers needing quick, compassionate support

YOUR EXPERTISE:
- Syncing twin sleep schedules and nap routines
- Tandem breastfeeding, bottle feeding, and formula prep
- Adjusted age calculations for premature babies
- Twin-proofing, babywearing two, and gear recommendations
- Managing postpartum mental health and twin-parent burnout
- Feeding schedules by age (what, when, how much)
- Bedtime routines that work for twins
- How to survive and thrive in the NICU
- Twin developmental milestones (corrected vs. chronological age)
- Pumping support and milk supply for twins
- Twin sibling dynamics and separation anxiety
- "You are not alone" reassurance and emotional validation

TONE:
- Warm, calm, compassionate, and never judgmental
- Like a knowledgeable best friend, not a clinical professional
- Validating of the difficulty without being alarmist
- Celebrating joy alongside exhaustion
- Concise and practical — parents are tired and reading on their phone

FORMAT:
- Keep responses to 2-4 short paragraphs or a brief intro + bullet list
- Use occasional gentle emoji where it feels natural (💕 🌙 🍼 ✨)
- No walls of text — mobile-first
- Lead with empathy, then practical tips

IMPORTANT SAFETY BOUNDARY:
You are NOT a medical professional. For anything involving health, development, medical concerns, or medication, ALWAYS gently refer parents to their pediatrician, NICU care team, lactation consultant, or healthcare provider. Include this naturally — never preachy, always caring. Example: "Your pediatrician will be the best person to weigh in on this — but in the meantime, here's what many twin parents find helpful..."

NEVER give specific medical diagnoses, recommend specific medications or dosages, replace professional medical advice, dismiss parent concerns, or use cold clinical language.`;

router.post("/twin-ai/chat", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = TwinAiChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { messages, category } = parsed.data;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [limitRow] = await db
    .select({ c: count() })
    .from(twinAiMessages)
    .where(and(eq(twinAiMessages.userId, userId), gte(twinAiMessages.createdAt, todayStart)));

  if ((limitRow?.c ?? 0) >= DAILY_LIMIT) {
    res.status(429).json({ error: "limit_reached" });
    return;
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const questionText = (lastUserMessage?.content ?? "").slice(0, 500);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: TWIN_AI_SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const [saved] = await db
      .insert(twinAiMessages)
      .values({ userId, question: questionText, category: category ?? null })
      .returning({ id: twinAiMessages.id });

    res.write(`data: ${JSON.stringify({ done: true, messageId: saved?.id ?? null })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Twin AI chat error");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
    res.end();
  }
});

router.patch("/twin-ai/messages/:id/feedback", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = TwinAiFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db
    .select({ id: twinAiMessages.id })
    .from(twinAiMessages)
    .where(and(eq(twinAiMessages.id, id), eq(twinAiMessages.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.update(twinAiMessages).set({ helpful: parsed.data.helpful }).where(eq(twinAiMessages.id, id));
  res.status(204).send();
});

router.get("/admin/twin-ai-analytics", async (req, res) => {
  if (!isAdminAuth(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [totalRow] = await db.select({ total: count() }).from(twinAiMessages);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayRow] = await db
    .select({ total: count() })
    .from(twinAiMessages)
    .where(gte(twinAiMessages.createdAt, todayStart));

  const [uniqueRow] = await db
    .select({ unique: sql<number>`COUNT(DISTINCT ${twinAiMessages.userId})` })
    .from(twinAiMessages);

  const [helpfulRow] = await db
    .select({ c: count() })
    .from(twinAiMessages)
    .where(eq(twinAiMessages.helpful, true));

  const [notHelpfulRow] = await db
    .select({ c: count() })
    .from(twinAiMessages)
    .where(eq(twinAiMessages.helpful, false));

  const categoryRows = await db
    .select({ category: twinAiMessages.category, c: count() })
    .from(twinAiMessages)
    .groupBy(twinAiMessages.category)
    .orderBy(desc(count()));

  const topQuestions = await db
    .select({ question: twinAiMessages.question, c: count() })
    .from(twinAiMessages)
    .groupBy(twinAiMessages.question)
    .orderBy(desc(count()))
    .limit(15);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyUsage = await db
    .select({
      date: sql<string>`to_char(${twinAiMessages.createdAt}, 'YYYY-MM-DD')`,
      c: count(),
    })
    .from(twinAiMessages)
    .where(gte(twinAiMessages.createdAt, sevenDaysAgo))
    .groupBy(sql`to_char(${twinAiMessages.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${twinAiMessages.createdAt}, 'YYYY-MM-DD')`);

  const total = totalRow?.total ?? 0;
  const uniqueUsers = Number(uniqueRow?.unique ?? 0);
  const avgPerUser = uniqueUsers > 0 ? Math.round((total / uniqueUsers) * 10) / 10 : 0;

  res.json({
    totalMessages: total,
    todayMessages: todayRow?.total ?? 0,
    uniqueUsers,
    avgPerUser,
    helpfulCount: helpfulRow?.c ?? 0,
    notHelpfulCount: notHelpfulRow?.c ?? 0,
    categoryBreakdown: categoryRows.map((r) => ({ key: r.category ?? "other", value: r.c })),
    topQuestions: topQuestions.map((r) => ({ question: r.question, count: r.c })),
    dailyUsage: dailyUsage.map((r) => ({ date: r.date, count: r.c })),
  });
});

export default router;
