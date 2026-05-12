import { Router, type IRouter } from "express";
import { desc, count } from "drizzle-orm";
import {
  db,
  twinsTable,
  onboardingTable,
  feedbackTable,
  sleepEntriesTable,
  feedingEntriesTable,
  diaperEntriesTable,
  milestonesTable,
  videoBookmarksTable,
  videoNotesTable,
} from "@workspace/db";
import { backfillOnboardingRows, type OnboardingRowData } from "../sheets";

const router: IRouter = Router();

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdmin(userId: string | undefined): boolean {
  return !!userId && getAdminIds().includes(userId);
}

router.get("/admin/stats", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  if (!isAdmin(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [
    uniqueUsers,
    onboardingRecords,
    feedbackRecords,
    [sleepCount],
    [feedingCount],
    [diaperCount],
    [milestoneCount],
    [bookmarkCount],
    [noteCount],
  ] = await Promise.all([
    db.selectDistinct({ userId: twinsTable.userId }).from(twinsTable),
    db.select().from(onboardingTable).orderBy(desc(onboardingTable.createdAt)),
    db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt)).limit(200),
    db.select({ count: count() }).from(sleepEntriesTable),
    db.select({ count: count() }).from(feedingEntriesTable),
    db.select({ count: count() }).from(diaperEntriesTable),
    db.select({ count: count() }).from(milestonesTable),
    db.select({ count: count() }).from(videoBookmarksTable),
    db.select({ count: count() }).from(videoNotesTable),
  ]);

  const completed = onboardingRecords.filter((r) => r.completedAt);

  function breakdown(field: (r: (typeof completed)[0]) => string | null | undefined) {
    return Object.entries(
      completed.reduce(
        (acc, r) => {
          const key = field(r) ?? "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    )
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, value }));
  }

  res.json({
    users: {
      uniqueUsersWithTwins: uniqueUsers.length,
      onboardingTotal: onboardingRecords.length,
      onboardingCompleted: completed.length,
      ambassadors: completed.filter((r) => r.isAmbassador).length,
    },
    onboarding: {
      parentStatus: breakdown((r) => r.parentStatus),
      multipleType: breakdown((r) => r.multipleType),
      babyAgeGroup: breakdown((r) => r.babyAgeGroup),
      isPremature: breakdown((r) => String(r.isPremature ?? "unknown")),
      biggestChallenge: breakdown((r) => r.biggestChallenge),
      featureInterest: breakdown((r) => r.featureInterest),
      discoverySource: breakdown((r) => r.discoverySource),
    },
    feedback: feedbackRecords,
    activity: {
      sleepEntries: Number(sleepCount?.count ?? 0),
      feedingEntries: Number(feedingCount?.count ?? 0),
      diaperEntries: Number(diaperCount?.count ?? 0),
      milestones: Number(milestoneCount?.count ?? 0),
      bookmarks: Number(bookmarkCount?.count ?? 0),
      videoNotes: Number(noteCount?.count ?? 0),
    },
  });
});

router.post("/admin/backfill-sheets", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  if (!isAdmin(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.log.info({ userId }, "admin: backfill-sheets triggered");

  const allRecords = await db
    .select()
    .from(onboardingTable)
    .orderBy(desc(onboardingTable.createdAt));

  req.log.info({ total: allRecords.length }, "admin: found onboarding records for backfill");

  const rows: OnboardingRowData[] = allRecords.map((r) => ({
    userId: r.userId,
    multipleType: r.multipleType,
    babyAgeGroup: r.babyAgeGroup,
    isPremature: r.isPremature,
    gestationalAgeWeeks: r.gestationalAgeWeeks,
    hadNicu: r.hadNicu,
    wantsAdjustedAge: r.wantsAdjustedAge,
    biggestChallenge: r.biggestChallenge,
    featureInterest: r.featureInterest,
    discoverySource: r.discoverySource,
    instagramHandle: r.instagramHandle,
    isAmbassador: r.isAmbassador,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  const result = await backfillOnboardingRows(rows);

  req.log.info(result, "admin: backfill-sheets complete");
  res.json(result);
});

router.post("/admin/polls", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  if (!isAdmin(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { question, category, options, isActive } = req.body as {
    question?: string;
    category?: string;
    options?: string;
    isActive?: boolean;
  };

  if (!question?.trim() || !options) {
    res.status(400).json({ error: "question and options are required" });
    return;
  }

  const { pollsTable } = await import("@workspace/db");

  const [poll] = await db
    .insert(pollsTable)
    .values({
      question: question.trim(),
      category: category ?? "community",
      options,
      isActive: isActive ?? true,
    })
    .returning();

  req.log.info({ pollId: poll.id, question: poll.question }, "admin: poll created");
  res.status(201).json(poll);
});

export default router;
