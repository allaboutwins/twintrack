import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import Layout, { PageHeader } from "@/components/Layout";
import { ChevronLeft, ChevronRight, Moon, Utensils, Baby, TrendingUp, TrendingDown, Minus, Flame, Calendar, Clock } from "lucide-react";

type Period = "day" | "week" | "month";
type Trend = "up" | "down" | "same";

interface DayPoint { date: string; minutes?: number; count?: number; }
interface TwinStat {
  twin: { id: number; label: string; name: string; colorTheme: string };
  sleep: {
    totalMinutes: number;
    totalSessions: number;
    napSessions: number;
    nightSessions: number;
    avgDailyMinutes: number;
    bestSessionMinutes: number;
    trend: Trend;
    dailyBreakdown: DayPoint[];
  };
  feeding: {
    total: number;
    byType: Record<string, number>;
    avgDaily: number;
    totalMl: number;
    lastFeedTime: string | null;
    trend: Trend;
    dailyBreakdown: DayPoint[];
  };
  diapers: {
    total: number;
    byType: Record<string, number>;
    avgDaily: number;
    lastDirtyTime: string | null;
    trend: Trend;
    dailyBreakdown: DayPoint[];
  };
  meta: {
    daysLogged: number;
    streak: number;
    totalDaysInPeriod: number;
  };
}
interface StatsData {
  period: string;
  dateRange: { start: string; end: string };
  days: string[];
  twins: TwinStat[];
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toDateOnly(iso: string): Date {
  return new Date(iso + "T12:00:00Z");
}

function dateLabel(period: Period, endDate: Date): string {
  if (period === "day") {
    return endDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  }
  if (period === "week") {
    const start = new Date(endDate.getTime() - 6 * 86400000);
    const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const e = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `${s} – ${e}`;
  }
  return endDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function TrendBadge({ trend, label }: { trend: Trend; label?: string }) {
  if (trend === "up") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">
      <TrendingUp size={9} /> {label ?? "Up"}
    </span>
  );
  if (trend === "down") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-500 bg-rose-50 rounded-full px-1.5 py-0.5">
      <TrendingDown size={9} /> {label ?? "Down"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
      <Minus size={9} /> Steady
    </span>
  );
}

function BarChart({
  data,
  valueKey,
  color,
  maxOverride,
  days,
}: {
  data: DayPoint[];
  valueKey: "minutes" | "count";
  color: string;
  maxOverride?: number;
  days: string[];
}) {
  const values = data.map((d) => (valueKey === "minutes" ? (d.minutes ?? 0) : (d.count ?? 0)));
  const max = maxOverride ?? Math.max(...values, 1);
  const showLabels = data.length <= 7;

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-0.5 h-14">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <div
              className="rounded-t-sm transition-all duration-300"
              style={{
                height: `${Math.max((v / max) * 100, v > 0 ? 10 : 4)}%`,
                backgroundColor: v > 0 ? color : "#e5e7eb",
                opacity: v > 0 ? 1 : 0.35,
                minHeight: "3px",
              }}
            />
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="flex gap-0.5">
          {days.map((day, i) => (
            <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
              {new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const FEED_TYPE_LABELS: Record<string, string> = {
  breastfeeding: "🤱 Breast",
  bottle: "🍼 Bottle",
  formula: "🧪 Formula",
  solids: "🥄 Solids",
};

const DIAPER_TYPE_LABELS: Record<string, string> = {
  wet: "💧 Wet",
  dirty: "💩 Dirty",
  mixed: "🌀 Mixed",
};

function InsightCard({ emoji, message, color }: { emoji: string; message: string; color: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: color + "12" }}
    >
      <span className="text-xl leading-none mt-0.5">{emoji}</span>
      <p className="text-sm text-foreground leading-snug">{message}</p>
    </div>
  );
}

function buildInsights(twins: TwinStat[], period: Period): Array<{ emoji: string; message: string; color: string }> {
  const insights: Array<{ emoji: string; message: string; color: string }> = [];

  for (const stat of twins) {
    const name = stat.twin.name || stat.twin.label;
    const color = stat.twin.colorTheme;
    const { sleep, feeding, diapers, meta } = stat;

    // Streak praise
    if (meta.streak >= 7) {
      insights.push({ emoji: "🔥", message: `${meta.streak}-day logging streak for ${name} — you're on fire!`, color });
    } else if (meta.streak >= 3) {
      insights.push({ emoji: "⭐", message: `${meta.streak} days logged in a row for ${name}. Keep it up!`, color });
    }

    // Sleep insights
    if (sleep.totalSessions > 0 && period !== "day") {
      if (sleep.trend === "up") {
        insights.push({ emoji: "😴", message: `${name} is sleeping more than last ${period} — great progress!`, color });
      }
      if (sleep.avgDailyMinutes >= 480) {
        insights.push({ emoji: "🌙", message: `${name} averaged ${fmtMins(sleep.avgDailyMinutes)}/day of sleep this ${period}. Well rested!`, color });
      }
      if (sleep.bestSessionMinutes >= 180) {
        insights.push({ emoji: "✨", message: `${name}'s best sleep this ${period} was ${fmtMins(sleep.bestSessionMinutes)}!`, color });
      }
    }

    // Feeding insights
    if (feeding.total > 0) {
      if (feeding.trend === "up" && period !== "day") {
        insights.push({ emoji: "🍼", message: `${name} had more feeds than last ${period}. Growing appetite!`, color });
      }
      if (feeding.avgDaily >= 6 && period !== "day") {
        insights.push({ emoji: "💪", message: `${name} averaged ${feeding.avgDaily} feeds/day — consistent and healthy.`, color });
      }
    }

    // Diaper insights — "last poop" callout
    if (diapers.lastDirtyTime) {
      const hoursAgo = (Date.now() - new Date(diapers.lastDirtyTime).getTime()) / 3600000;
      if (hoursAgo > 48) {
        insights.push({ emoji: "⚠️", message: `${name}'s last dirty diaper was ${timeAgo(diapers.lastDirtyTime)} — keep an eye on this.`, color: "#f59e0b" });
      }
    }

    // Days logged
    if (period !== "day" && meta.daysLogged === meta.totalDaysInPeriod) {
      insights.push({ emoji: "🏆", message: `You logged every single day for ${name} this ${period}!`, color });
    } else if (period !== "day" && meta.daysLogged > 0) {
      insights.push({ emoji: "📅", message: `${meta.daysLogged} of ${meta.totalDaysInPeriod} days logged for ${name}.`, color });
    }
  }

  // Combined twins comparison (only if 2 twins)
  if (twins.length === 2) {
    const [a, b] = twins;
    const aName = a.twin.name || a.twin.label;
    const bName = b.twin.name || b.twin.label;
    if (a.sleep.totalMinutes > 0 && b.sleep.totalMinutes > 0) {
      const diff = Math.abs(a.sleep.totalMinutes - b.sleep.totalMinutes);
      if (diff < 30 && period !== "day") {
        insights.push({ emoji: "🤝", message: `${aName} and ${bName} slept almost the same amount this ${period}. In sync!`, color: "#8b5cf6" });
      }
    }
  }

  return insights.slice(0, 4);
}

function StatRow({
  icon,
  iconBg,
  label,
  primary,
  secondary,
  trend,
  trendLabel,
  extra,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  primary: string;
  secondary?: string;
  trend?: Trend;
  trendLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-base font-bold text-foreground">{primary}</span>
          {secondary && <span className="text-xs text-muted-foreground">{secondary}</span>}
        </div>
        {extra}
      </div>
      {trend && <TrendBadge trend={trend} label={trendLabel} />}
    </div>
  );
}

function TwinStatCard({ stat, period, days, focusSection }: { stat: TwinStat; period: Period; days: string[]; focusSection?: string }) {
  const { twin, sleep, feeding, diapers, meta } = stat;
  const isMultiDay = period !== "day";
  const color = twin.colorTheme;
  const name = twin.name || twin.label;

  const hasSleep = sleep.totalSessions > 0;
  const hasFeeding = feeding.total > 0;
  const hasDiapers = diapers.total > 0;

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: color + "18" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ backgroundColor: color }}
          >
            {name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-foreground leading-none">{name}</p>
            {isMultiDay && meta.daysLogged > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {meta.daysLogged}/{meta.totalDaysInPeriod} days logged
              </p>
            )}
          </div>
        </div>
        {meta.streak >= 2 && (
          <div className="flex items-center gap-1 bg-white/60 rounded-full px-2.5 py-1">
            <Flame size={12} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-600">{meta.streak}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4 divide-y divide-border/60">

        {/* Sleep section */}
        {(!focusSection || focusSection === 'sleep') && (
        <div id="stats-sleep" className="space-y-3">
          {hasSleep ? (
            <>
              <StatRow
                icon={<Moon size={15} className="text-blue-500" />}
                iconBg="bg-blue-50"
                label="Sleep"
                primary={fmtMins(sleep.totalMinutes)}
                secondary={isMultiDay ? `avg ${fmtMins(sleep.avgDailyMinutes)}/day` : `${sleep.totalSessions} session${sleep.totalSessions !== 1 ? "s" : ""}`}
                trend={isMultiDay ? sleep.trend : undefined}
              />
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{sleep.napSessions} nap{sleep.napSessions !== 1 ? "s" : ""}</span>
                <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">{sleep.nightSessions} night{sleep.nightSessions !== 1 ? "s" : ""}</span>
                {sleep.bestSessionMinutes > 0 && isMultiDay && (
                  <span className="text-[10px] font-medium bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">best: {fmtMins(sleep.bestSessionMinutes)}</span>
                )}
              </div>
              {isMultiDay && (
                <BarChart data={sleep.dailyBreakdown} valueKey="minutes" color={color} days={days} />
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Moon size={15} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sleep</p>
                <p className="text-xs text-muted-foreground italic">No data yet</p>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Feeding section */}
        {(!focusSection || focusSection === 'feeding') && (
        <div id="stats-feeding" className="pt-4 space-y-3">
          {hasFeeding ? (
            <>
              <StatRow
                icon={<Utensils size={15} className="text-pink-500" />}
                iconBg="bg-pink-50"
                label="Feeding"
                primary={`${feeding.total} feed${feeding.total !== 1 ? "s" : ""}`}
                secondary={isMultiDay ? `avg ${feeding.avgDaily}/day` : undefined}
                trend={isMultiDay ? feeding.trend : undefined}
              />
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(feeding.byType).map(([type, cnt]) => (
                  <span key={type} className="text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-100 rounded-full px-2 py-0.5">
                    {FEED_TYPE_LABELS[type] ?? type} ×{cnt}
                  </span>
                ))}
              </div>
              {feeding.totalMl > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total volume: <span className="font-semibold text-foreground">{feeding.totalMl} ml</span>
                </p>
              )}
              {feeding.lastFeedTime && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={10} />
                  <span>Last feed: <span className="font-medium text-foreground">{timeAgo(feeding.lastFeedTime)}</span></span>
                </div>
              )}
              {isMultiDay && (
                <BarChart data={feeding.dailyBreakdown} valueKey="count" color={color} days={days} />
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                <Utensils size={15} className="text-pink-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Feeding</p>
                <p className="text-xs text-muted-foreground italic">No data yet</p>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Diapers section */}
        {(!focusSection || focusSection === 'diapers') && (
        <div id="stats-diapers" className="pt-4 space-y-3">
          {hasDiapers ? (
            <>
              <StatRow
                icon={<Baby size={15} className="text-amber-500" />}
                iconBg="bg-amber-50"
                label="Diapers"
                primary={`${diapers.total} change${diapers.total !== 1 ? "s" : ""}`}
                secondary={isMultiDay ? `avg ${diapers.avgDaily}/day` : undefined}
                trend={isMultiDay ? diapers.trend : undefined}
              />
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(diapers.byType).map(([type, cnt]) => (
                  <span key={type} className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5">
                    {DIAPER_TYPE_LABELS[type] ?? type} ×{cnt}
                  </span>
                ))}
              </div>
              {diapers.lastDirtyTime && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={10} />
                  <span>Last dirty: <span className="font-medium text-foreground">{timeAgo(diapers.lastDirtyTime)}</span></span>
                </div>
              )}
              {isMultiDay && (
                <BarChart data={diapers.dailyBreakdown} valueKey="count" color={color} days={days} />
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Baby size={15} className="text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Diapers</p>
                <p className="text-xs text-muted-foreground italic">No data yet</p>
              </div>
            </div>
          )}
        </div>
        )}

      </div>
    </div>
  );
}

function StreakBanner({ twins }: { twins: TwinStat[] }) {
  const maxStreak = Math.max(...twins.map((t) => t.meta.streak));
  if (maxStreak < 1) return null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-sm flex-shrink-0">
        <Flame size={18} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-orange-800">{maxStreak}-day logging streak</p>
        <p className="text-xs text-orange-600">You're building a valuable health record</p>
      </div>
    </div>
  );
}

function SummaryPills({ twins, period }: { twins: TwinStat[]; period: Period }) {
  if (period === "day" || twins.length === 0) return null;

  const totalFeeds = twins.reduce((s, t) => s + t.feeding.total, 0);
  const totalSleep = twins.reduce((s, t) => s + t.sleep.totalMinutes, 0);
  const totalDiapers = twins.reduce((s, t) => s + t.diapers.total, 0);
  const maxDaysLogged = Math.max(...twins.map((t) => t.meta.daysLogged));
  const totalDays = twins[0]?.meta.totalDaysInPeriod ?? 1;

  return (
    <div className="grid grid-cols-2 gap-2">
      {totalSleep > 0 && (
        <div className="bg-blue-50 rounded-2xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-blue-700">{fmtMins(totalSleep)}</p>
          <p className="text-[10px] text-blue-500 font-medium">Combined sleep</p>
        </div>
      )}
      {totalFeeds > 0 && (
        <div className="bg-pink-50 rounded-2xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-pink-700">{totalFeeds}</p>
          <p className="text-[10px] text-pink-500 font-medium">Total feeds</p>
        </div>
      )}
      {totalDiapers > 0 && (
        <div className="bg-amber-50 rounded-2xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-amber-700">{totalDiapers}</p>
          <p className="text-[10px] text-amber-500 font-medium">Diaper changes</p>
        </div>
      )}
      {maxDaysLogged > 0 && (
        <div className="bg-purple-50 rounded-2xl px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-purple-700">{maxDaysLogged}/{totalDays}</p>
          <p className="text-[10px] text-purple-500 font-medium">Days logged</p>
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>("week");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusSection] = useState<string | undefined>(
    () => new URLSearchParams(window.location.search).get('section') ?? undefined,
  );
  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/stats?userId=${encodeURIComponent(user.id)}&period=${period}&date=${endDate}`,
      );
      if (res.ok) setData(await res.json() as StatsData);
    } finally {
      setLoading(false);
    }
  }, [user?.id, period, endDate, baseUrl]);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  function navigate(dir: 1 | -1) {
    const stepDays = period === "day" ? 1 : period === "week" ? 7 : 30;
    const d = toDateOnly(endDate);
    d.setUTCDate(d.getUTCDate() + dir * stepDays);
    const next = d.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];
    if (next <= todayStr) setEndDate(next);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const atPresent =
    period === "day" ? endDate === todayStr :
    period === "week" ? endDate === todayStr :
    endDate === todayStr;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "day", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
  ];

  const endDateObj = toDateOnly(endDate);
  const hasAnyData = data?.twins.some(
    (t) => t.sleep.totalSessions > 0 || t.feeding.total > 0 || t.diapers.total > 0,
  );

  const insights = data && hasAnyData ? buildInsights(data.twins, period) : [];

  return (
    <Layout>
      <PageHeader
        title={focusSection === 'sleep' ? 'Sleep Stats' : focusSection === 'feeding' ? 'Feeding Stats' : focusSection === 'diapers' ? 'Diaper Stats' : 'Stats'}
        subtitle="Your twins' progress at a glance"
      />

      <div className="px-4 pb-6 space-y-4">
        {/* Period tabs */}
        <div className="flex gap-1 bg-muted rounded-2xl p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setPeriod(key); setEndDate(todayStr); }}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                period === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
              data-testid={`period-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-border px-3 py-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-90 transition-all"
            data-testid="stats-prev"
          >
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{dateLabel(period, endDateObj)}</p>
          </div>
          <button
            onClick={() => navigate(1)}
            disabled={atPresent}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-90 transition-all disabled:opacity-30"
            data-testid="stats-next"
          >
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-border h-12 animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              {[0,1,2,3].map((i) => <div key={i} className="bg-muted rounded-2xl h-16 animate-pulse" />)}
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-border h-64 animate-pulse" />
            ))}
          </div>
        ) : !data || data.twins.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-5xl">📈</p>
            <p className="font-semibold text-foreground">No twins set up yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your twins in Settings to start tracking.</p>
          </div>
        ) : !hasAnyData ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-5xl">💕</p>
            <div>
              <p className="font-semibold text-foreground">Nothing logged yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                Start logging sleep, feeding, and diapers — your stats will build over time.
              </p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 text-left space-y-2 max-w-xs mx-auto">
              {["😴 Log some sleep", "🍼 Record a feed", "💧 Track a diaper change"].map((tip) => (
                <p key={tip} className="text-sm text-muted-foreground">{tip}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Streak banner */}
            <StreakBanner twins={data.twins} />

            {/* Combined summary pills */}
            {data.twins.length >= 1 && (
              <SummaryPills twins={data.twins} period={period} />
            )}

            {/* Insight cards */}
            {insights.length > 0 && (
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <InsightCard key={i} emoji={ins.emoji} message={ins.message} color={ins.color} />
                ))}
              </div>
            )}

            {/* Per-twin detail cards */}
            {data.twins.map((stat) => (
              <TwinStatCard key={stat.twin.id} stat={stat} period={period} days={data.days} focusSection={focusSection} />
            ))}

            <p className="text-center text-[10px] text-muted-foreground pt-1 pb-2">
              {period === "day" ? "Today's summary" : period === "week" ? "Last 7 days" : "Last 30 days"} · Updates live as you log
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
