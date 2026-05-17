import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, pollsTable, pollResponsesTable } from "@workspace/db";

const router: IRouter = Router();

function parsePollOptions(raw: string): { key: string; label: string }[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function buildPollWithResponse(
  poll: typeof pollsTable.$inferSelect,
  userId: string,
): Promise<object> {
  const options = parsePollOptions(poll.options);

  const userResponse = await db
    .select()
    .from(pollResponsesTable)
    .where(and(eq(pollResponsesTable.pollId, poll.id), eq(pollResponsesTable.userId, userId)))
    .limit(1);

  const hasResponded = userResponse.length > 0;
  const userOptionKey = hasResponded ? userResponse[0].optionKey : null;

  let results = null;
  if (hasResponded) {
    const allResponses = await db
      .select()
      .from(pollResponsesTable)
      .where(eq(pollResponsesTable.pollId, poll.id));

    const totalResponses = allResponses.length;
    const counts: Record<string, number> = {};
    for (const r of allResponses) {
      counts[r.optionKey] = (counts[r.optionKey] ?? 0) + 1;
    }

    const breakdown = options.map((opt) => ({
      optionKey: opt.key,
      count: counts[opt.key] ?? 0,
      percentage: totalResponses > 0 ? Math.round(((counts[opt.key] ?? 0) / totalResponses) * 100) : 0,
    }));

    results = { totalResponses, breakdown };
  }

  return {
    id: poll.id,
    question: poll.question,
    category: poll.category,
    options,
    isActive: poll.isActive,
    startsAt: poll.startsAt?.toISOString() ?? null,
    endsAt: poll.endsAt?.toISOString() ?? null,
    createdAt: poll.createdAt.toISOString(),
    hasResponded,
    userOptionKey,
    results,
  };
}

router.get("/polls/active", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;

  const [poll] = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.isActive, true))
    .orderBy(sql`${pollsTable.createdAt} DESC`)
    .limit(1);

  if (!poll) {
    res.status(404).json({ error: "No active poll" });
    return;
  }

  const result = await buildPollWithResponse(poll, userId ?? "");
  res.json(result);
});

router.get("/polls/history", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;

  const polls = await db
    .select()
    .from(pollsTable)
    .orderBy(sql`${pollsTable.createdAt} DESC`);

  const results = await Promise.all(polls.map((poll) => buildPollWithResponse(poll, userId ?? "")));
  res.json(results);
});

router.post("/polls/:id/respond", async (req, res): Promise<void> => {
  const pollId = Number(req.params.id);
  const { userId, optionKey } = req.body as { userId?: string; optionKey?: string };

  if (!userId || !optionKey) {
    res.status(400).json({ error: "userId and optionKey are required" });
    return;
  }

  const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, pollId)).limit(1);
  if (!poll) {
    res.status(404).json({ error: "Poll not found" });
    return;
  }

  const existing = await db
    .select()
    .from(pollResponsesTable)
    .where(and(eq(pollResponsesTable.pollId, pollId), eq(pollResponsesTable.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already responded to this poll" });
    return;
  }

  await db.insert(pollResponsesTable).values({ pollId, userId, optionKey });

  req.log.info({ pollId, userId, optionKey }, "polls: response recorded");

  const result = await buildPollWithResponse(poll, userId);
  res.status(201).json(result);
});

export default router;
