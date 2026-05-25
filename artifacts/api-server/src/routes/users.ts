import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  twinsTable,
  onboardingTable,
  feedbackTable,
  milestonesTable,
  routinesTable,
  routineTasksTable,
  pollResponsesTable,
  twinAiMessages,
  sleepEntriesTable,
  feedingEntriesTable,
  diaperEntriesTable,
  foodsIntroducedTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.delete("/users/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const twins = await db
      .select({ id: twinsTable.id })
      .from(twinsTable)
      .where(eq(twinsTable.userId, userId));
    const twinIds = twins.map((t) => t.id);

    if (twinIds.length > 0) {
      await db.delete(sleepEntriesTable).where(inArray(sleepEntriesTable.twinId, twinIds));
      await db.delete(feedingEntriesTable).where(inArray(feedingEntriesTable.twinId, twinIds));
      await db.delete(diaperEntriesTable).where(inArray(diaperEntriesTable.twinId, twinIds));
      await db.delete(foodsIntroducedTable).where(inArray(foodsIntroducedTable.twinId, twinIds));
      await db.delete(milestonesTable).where(inArray(milestonesTable.twinId, twinIds));
    }

    const routines = await db
      .select({ id: routinesTable.id })
      .from(routinesTable)
      .where(eq(routinesTable.userId, userId));
    const routineIds = routines.map((r) => r.id);
    if (routineIds.length > 0) {
      await db.delete(routineTasksTable).where(inArray(routineTasksTable.routineId, routineIds));
    }
    await db.delete(routinesTable).where(eq(routinesTable.userId, userId));
    await db.delete(pollResponsesTable).where(eq(pollResponsesTable.userId, userId));
    await db.delete(twinAiMessages).where(eq(twinAiMessages.userId, userId));
    await db.delete(onboardingTable).where(eq(onboardingTable.userId, userId));
    await db.delete(feedbackTable).where(eq(feedbackTable.userId, userId));
    await db.delete(twinsTable).where(eq(twinsTable.userId, userId));

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (secretKey) {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (!clerkRes.ok) {
        req.log.error({ status: clerkRes.status }, "users: Clerk user deletion failed");
      }
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "users: account deletion failed");
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

export default router;
