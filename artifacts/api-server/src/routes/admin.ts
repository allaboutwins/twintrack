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

const router: IRouter = Router();

function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

router.get("/admin/stats", async (req, res): Promise<void> => {
  const userId = req.query.userId as string | undefined;
  const adminIds = getAdminIds();

  if (!userId || !adminIds.includes(userId)) {
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
    db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt)).limit(100),
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
    },
    onboarding: {
      parentStatus: breakdown((r) => r.parentStatus),
      multipleType: breakdown((r) => r.multipleType),
      babyAgeGroup: breakdown((r) => r.babyAgeGroup),
      isPremature: breakdown((r) => String(r.isPremature ?? "unknown")),
      biggestChallenge: breakdown((r) => r.biggestChallenge),
      featureInterest: breakdown((r) => r.featureInterest),
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

export default router;
