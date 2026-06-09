import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, twinsTable, sleepEntriesTable, feedingEntriesTable, diaperEntriesTable } from "@workspace/db";
import { GetDashboardSummaryQueryParams } from "@workspace/api-zod";

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

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, date } = parsed.data;
  const timezone = (parsed.data as Record<string, unknown>).timezone as string | null | undefined;
  const { dayStart, dayEnd } = getDayBoundsUTC(date, timezone);

  const twins = await db.select().from(twinsTable).where(eq(twinsTable.userId, userId));

  const twinSummaries = await Promise.all(
    twins.map(async (twin) => {
      const sleepEntries = await db
        .select()
        .from(sleepEntriesTable)
        .where(
          and(
            eq(sleepEntriesTable.twinId, twin.id),
            gte(sleepEntriesTable.startTime, dayStart),
            lte(sleepEntriesTable.startTime, dayEnd),
          ),
        );

      const feedingEntries = await db
        .select()
        .from(feedingEntriesTable)
        .where(
          and(
            eq(feedingEntriesTable.twinId, twin.id),
            gte(feedingEntriesTable.time, dayStart),
            lte(feedingEntriesTable.time, dayEnd),
          ),
        );

      const diaperEntries = await db
        .select()
        .from(diaperEntriesTable)
        .where(
          and(
            eq(diaperEntriesTable.twinId, twin.id),
            gte(diaperEntriesTable.time, dayStart),
            lte(diaperEntriesTable.time, dayEnd),
          ),
        );

      const [lastSleep] = await db
        .select()
        .from(sleepEntriesTable)
        .where(eq(sleepEntriesTable.twinId, twin.id))
        .orderBy(desc(sleepEntriesTable.startTime))
        .limit(1);

      const [lastFeeding] = await db
        .select()
        .from(feedingEntriesTable)
        .where(eq(feedingEntriesTable.twinId, twin.id))
        .orderBy(desc(feedingEntriesTable.time))
        .limit(1);

      const activeSleepEntry = sleepEntries.find((e) => e.endTime === null) ?? null;

      const todaySleepMinutes = sleepEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

      return {
        twin: {
          ...twin,
          createdAt: twin.createdAt.toISOString(),
          updatedAt: twin.updatedAt.toISOString(),
        },
        todaySleepMinutes,
        todayFeedingCount: feedingEntries.length,
        todayDiaperCount: diaperEntries.length,
        lastSleep: lastSleep
          ? {
              ...lastSleep,
              startTime: lastSleep.startTime.toISOString(),
              endTime: lastSleep.endTime ? lastSleep.endTime.toISOString() : null,
              createdAt: lastSleep.createdAt.toISOString(),
            }
          : null,
        lastFeeding: lastFeeding
          ? {
              ...lastFeeding,
              time: lastFeeding.time.toISOString(),
              createdAt: lastFeeding.createdAt.toISOString(),
            }
          : null,
        activeSleepEntry: activeSleepEntry
          ? {
              ...activeSleepEntry,
              startTime: activeSleepEntry.startTime.toISOString(),
              endTime: null,
              createdAt: activeSleepEntry.createdAt.toISOString(),
            }
          : null,
      };
    }),
  );

  res.json({ userId, date, twins: twinSummaries });
});

export default router;
