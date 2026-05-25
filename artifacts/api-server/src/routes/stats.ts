import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
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

  const twins = await db.select().from(twinsTable).where(eq(twinsTable.userId, userId));

  const twinStats = await Promise.all(
    twins.map(async (twin) => {
      const [sleepEntries, feedingEntries, diaperEntries] = await Promise.all([
        db.select().from(sleepEntriesTable).where(
          and(
            eq(sleepEntriesTable.twinId, twin.id),
            gte(sleepEntriesTable.startTime, start),
            lte(sleepEntriesTable.startTime, end),
          ),
        ),
        db.select().from(feedingEntriesTable).where(
          and(
            eq(feedingEntriesTable.twinId, twin.id),
            gte(feedingEntriesTable.time, start),
            lte(feedingEntriesTable.time, end),
          ),
        ),
        db.select().from(diaperEntriesTable).where(
          and(
            eq(diaperEntriesTable.twinId, twin.id),
            gte(diaperEntriesTable.time, start),
            lte(diaperEntriesTable.time, end),
          ),
        ),
      ]);

      const totalSleepMinutes = sleepEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
      const napSessions = sleepEntries.filter((e) => e.type === "nap").length;
      const nightSessions = sleepEntries.filter((e) => e.type === "night").length;
      const sleepByDay = days.map((day) => ({
        date: day,
        minutes: sleepEntries
          .filter((e) => e.startTime.toISOString().startsWith(day))
          .reduce((s, e) => s + (e.durationMinutes ?? 0), 0),
      }));

      const feedingByType = feedingEntries.reduce<Record<string, number>>((acc, e) => {
        acc[e.feedingType] = (acc[e.feedingType] ?? 0) + 1;
        return acc;
      }, {});
      const feedingByDay = days.map((day) => ({
        date: day,
        count: feedingEntries.filter((e) => e.time.toISOString().startsWith(day)).length,
      }));

      const diaperByType = diaperEntries.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {});
      const diaperByDay = days.map((day) => ({
        date: day,
        count: diaperEntries.filter((e) => e.time.toISOString().startsWith(day)).length,
      }));

      const n = days.length;
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
          avgDailyMinutes: n > 1 ? Math.round(totalSleepMinutes / n) : totalSleepMinutes,
          dailyBreakdown: sleepByDay,
        },
        feeding: {
          total: feedingEntries.length,
          byType: feedingByType,
          avgDaily: n > 1 ? Math.round((feedingEntries.length / n) * 10) / 10 : feedingEntries.length,
          dailyBreakdown: feedingByDay,
        },
        diapers: {
          total: diaperEntries.length,
          byType: diaperByType,
          avgDaily: n > 1 ? Math.round((diaperEntries.length / n) * 10) / 10 : diaperEntries.length,
          dailyBreakdown: diaperByDay,
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
