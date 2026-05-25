import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, twinsTable, sleepEntriesTable, feedingEntriesTable, diaperEntriesTable } from "@workspace/db";

const router: IRouter = Router();

function getPeriodBounds(period: string, date: string) {
  const dayCount = period === "month" ? 30 : period === "week" ? 7 : 1;
  const endDate = new Date(`${date}T23:59:59.999Z`);
  const startDate = new Date(endDate.getTime() - (dayCount - 1) * 24 * 60 * 60 * 1000);
  startDate.setUTCHours(0, 0, 0, 0);

  const days: string[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    days.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return { start: startDate, end: endDate, days };
}

function getPrevPeriodBounds(period: string, date: string) {
  const dayCount = period === "month" ? 30 : period === "week" ? 7 : 1;
  const curStart = new Date(`${date}T23:59:59.999Z`);
  curStart.setUTCDate(curStart.getUTCDate() - (dayCount - 1));
  curStart.setUTCHours(0, 0, 0, 0);
  const prevEnd = new Date(curStart.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - (dayCount - 1) * 24 * 60 * 60 * 1000);
  prevStart.setUTCHours(0, 0, 0, 0);
  return { start: prevStart, end: prevEnd };
}

function computeLoggingStreak(allDays: string[], sortedEntryDates: string[]): number {
  const logged = new Set(sortedEntryDates);
  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  const cur = new Date(today);
  while (true) {
    const d = cur.toISOString().split("T")[0];
    if (logged.has(d)) {
      streak++;
      cur.setUTCDate(cur.getUTCDate() - 1);
    } else {
      break;
    }
    if (streak > 365) break;
  }
  return streak;
}

function dayKey(ts: Date): string {
  return ts.toISOString().split("T")[0];
}

router.get("/stats", async (req, res): Promise<void> => {
  const { userId, period = "week", date } = req.query as {
    userId?: string;
    period?: string;
    date?: string;
  };

  if (!userId || !date) {
    res.status(400).json({ error: "userId and date are required" });
    return;
  }

  const { start, end, days } = getPeriodBounds(period, date);
  const prev = getPrevPeriodBounds(period, date);

  const twins = await db.select().from(twinsTable).where(eq(twinsTable.userId, userId));

  const twinStats = await Promise.all(
    twins.map(async (twin) => {
      const [sleepEntries, feedingEntries, diaperEntries, prevSleep, prevFeeding, prevDiapers, lastDirty] =
        await Promise.all([
          db.select().from(sleepEntriesTable).where(
            and(eq(sleepEntriesTable.twinId, twin.id), gte(sleepEntriesTable.startTime, start), lte(sleepEntriesTable.startTime, end)),
          ),
          db.select().from(feedingEntriesTable).where(
            and(eq(feedingEntriesTable.twinId, twin.id), gte(feedingEntriesTable.time, start), lte(feedingEntriesTable.time, end)),
          ),
          db.select().from(diaperEntriesTable).where(
            and(eq(diaperEntriesTable.twinId, twin.id), gte(diaperEntriesTable.time, start), lte(diaperEntriesTable.time, end)),
          ),
          db.select().from(sleepEntriesTable).where(
            and(eq(sleepEntriesTable.twinId, twin.id), gte(sleepEntriesTable.startTime, prev.start), lte(sleepEntriesTable.startTime, prev.end)),
          ),
          db.select().from(feedingEntriesTable).where(
            and(eq(feedingEntriesTable.twinId, twin.id), gte(feedingEntriesTable.time, prev.start), lte(feedingEntriesTable.time, prev.end)),
          ),
          db.select().from(diaperEntriesTable).where(
            and(eq(diaperEntriesTable.twinId, twin.id), gte(diaperEntriesTable.time, prev.start), lte(diaperEntriesTable.time, prev.end)),
          ),
          db.select().from(diaperEntriesTable)
            .where(and(eq(diaperEntriesTable.twinId, twin.id)))
            .orderBy(desc(diaperEntriesTable.time))
            .limit(1),
        ]);

      const n = days.length;

      // Sleep aggregates
      const totalSleepMinutes = sleepEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
      const napSessions = sleepEntries.filter((e) => e.type === "nap").length;
      const nightSessions = sleepEntries.filter((e) => e.type === "night").length;
      const avgDailySleep = n > 1 ? Math.round(totalSleepMinutes / n) : totalSleepMinutes;
      const sleepByDay = days.map((day) => ({
        date: day,
        minutes: sleepEntries.filter((e) => dayKey(e.startTime) === day).reduce((s, e) => s + (e.durationMinutes ?? 0), 0),
      }));
      const prevTotalSleep = prevSleep.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
      const sleepTrend: "up" | "down" | "same" = prevTotalSleep === 0
        ? "same"
        : totalSleepMinutes > prevTotalSleep * 1.05 ? "up"
        : totalSleepMinutes < prevTotalSleep * 0.95 ? "down"
        : "same";

      // Best sleep session in period
      const bestSleep = sleepEntries.reduce((best, e) => Math.max(best, e.durationMinutes ?? 0), 0);

      // Feeding aggregates
      const feedingByType = feedingEntries.reduce<Record<string, number>>((acc, e) => {
        acc[e.feedingType] = (acc[e.feedingType] ?? 0) + 1;
        return acc;
      }, {});
      const feedingByDay = days.map((day) => ({
        date: day,
        count: feedingEntries.filter((e) => dayKey(e.time) === day).length,
      }));
      const avgDailyFeeds = n > 1 ? Math.round((feedingEntries.length / n) * 10) / 10 : feedingEntries.length;
      const prevFeedCount = prevFeeding.length;
      const feedTrend: "up" | "down" | "same" = prevFeedCount === 0
        ? "same"
        : feedingEntries.length > prevFeedCount * 1.05 ? "up"
        : feedingEntries.length < prevFeedCount * 0.95 ? "down"
        : "same";
      const lastFeed = feedingEntries.length > 0
        ? feedingEntries.reduce((latest, e) => e.time > latest ? e.time : latest, feedingEntries[0].time)
        : null;

      // Total ml in period (bottle + formula)
      const totalMl = feedingEntries.reduce((s, e) => s + (e.amountMl ?? 0), 0);

      // Diaper aggregates
      const diaperByType = diaperEntries.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {});
      const diaperByDay = days.map((day) => ({
        date: day,
        count: diaperEntries.filter((e) => dayKey(e.time) === day).length,
      }));
      const avgDailyDiapers = n > 1 ? Math.round((diaperEntries.length / n) * 10) / 10 : diaperEntries.length;
      const prevDiaperCount = prevDiapers.length;
      const diaperTrend: "up" | "down" | "same" = prevDiaperCount === 0
        ? "same"
        : diaperEntries.length > prevDiaperCount * 1.05 ? "up"
        : diaperEntries.length < prevDiaperCount * 0.95 ? "down"
        : "same";
      const lastDirtyTime = lastDirty.length > 0 ? lastDirty[0].time : null;

      // Logging streak — days in current period that had ANY log
      const loggedDaysInPeriod = new Set([
        ...sleepEntries.map((e) => dayKey(e.startTime)),
        ...feedingEntries.map((e) => dayKey(e.time)),
        ...diaperEntries.map((e) => dayKey(e.time)),
      ]);
      const daysLogged = loggedDaysInPeriod.size;

      // Overall streak from today backwards
      const allLoggedDays = Array.from(loggedDaysInPeriod).sort();
      const streak = computeLoggingStreak(days, allLoggedDays);

      return {
        twin: {
          id: twin.id,
          label: twin.label,
          name: twin.name,
          colorTheme: twin.colorTheme,
        },
        sleep: {
          totalMinutes: totalSleepMinutes,
          totalSessions: sleepEntries.length,
          napSessions,
          nightSessions,
          avgDailyMinutes: avgDailySleep,
          bestSessionMinutes: bestSleep,
          trend: sleepTrend,
          dailyBreakdown: sleepByDay,
        },
        feeding: {
          total: feedingEntries.length,
          byType: feedingByType,
          avgDaily: avgDailyFeeds,
          totalMl: Math.round(totalMl),
          lastFeedTime: lastFeed ? lastFeed.toISOString() : null,
          trend: feedTrend,
          dailyBreakdown: feedingByDay,
        },
        diapers: {
          total: diaperEntries.length,
          byType: diaperByType,
          avgDaily: avgDailyDiapers,
          lastDirtyTime: lastDirtyTime ? lastDirtyTime.toISOString() : null,
          trend: diaperTrend,
          dailyBreakdown: diaperByDay,
        },
        meta: {
          daysLogged,
          streak,
          totalDaysInPeriod: n,
        },
      };
    }),
  );

  res.json({
    period,
    dateRange: {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    },
    days,
    twins: twinStats,
  });
});

export default router;
