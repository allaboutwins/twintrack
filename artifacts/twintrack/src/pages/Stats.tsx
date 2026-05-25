import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import Layout, { PageHeader } from "@/components/Layout";
import { ChevronLeft, ChevronRight, Moon, Utensils, Baby } from "lucide-react";

type Period = "day" | "week" | "month";

interface DayPoint { date: string; minutes?: number; count?: number; }
interface TwinStat {
  twin: { id: number; label: string; name: string; colorTheme: string };
  sleep: {
    totalMinutes: number;
    totalSessions: number;
    napSessions: number;
    nightSessions: number;
    avgDailyMinutes: number;
    dailyBreakdown: DayPoint[];
  };
  feeding: {
    total: number;
    byType: Record<string, number>;
    avgDaily: number;
    dailyBreakdown: DayPoint[];
  };
  diapers: {
    total: number;
    byType: Record<string, number>;
    avgDaily: number;
    dailyBreakdown: DayPoint[];
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

function MiniBarChart({
  data,
  valueKey,
  color,
  maxOverride,
}: {
  data: DayPoint[];
  valueKey: "minutes" | "count";
  color: string;
  maxOverride?: number;
}) {
  const values = data.map((d) => (valueKey === "minutes" ? d.minutes ?? 0 : d.count ?? 0));
  const max = maxOverride ?? Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max((v / max) * 100, v > 0 ? 8 : 3)}%`,
            backgroundColor: v > 0 ? color : "#e5e7eb",
            opacity: v > 0 ? 1 : 0.4,
          }}
        />
      ))}
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

function TwinStatCard({ stat, period }: { stat: TwinStat; period: Period }) {
  const { twin, sleep, feeding, diapers } = stat;
  const isMultiDay = period !== "day";
  const color = twin.colorTheme;

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: color + "18" }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          {(twin.name || twin.label).charAt(0)}
        </div>
        <p className="font-bold text-foreground">{twin.name || twin.label}</p>
      </div>

      <div className="divide-y divide-border">
        {/* Sleep */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <Moon size={13} className="text-blue-500" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sleep</span>
            </div>
            {sleep.totalSessions === 0 ? (
              <span className="text-xs text-muted-foreground italic">No data</span>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold text-foreground">{fmtMins(sleep.totalMinutes)}</span>
                {isMultiDay && (
                  <span className="text-xs text-muted-foreground">avg {fmtMins(sleep.avgDailyMinutes)}/day</span>
                )}
              </div>
            )}
          </div>
          {sleep.totalSessions > 0 && (
            <>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="bg-muted rounded-full px-2 py-0.5">{sleep.napSessions} nap{sleep.napSessions !== 1 ? "s" : ""}</span>
                <span className="bg-muted rounded-full px-2 py-0.5">{sleep.nightSessions} night{sleep.nightSessions !== 1 ? "s" : ""}</span>
              </div>
              {isMultiDay && (
                <MiniBarChart data={sleep.dailyBreakdown} valueKey="minutes" color={color} />
              )}
            </>
          )}
        </div>

        {/* Feeding */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center">
                <Utensils size={13} className="text-pink-500" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feeding</span>
            </div>
            {feeding.total === 0 ? (
              <span className="text-xs text-muted-foreground italic">No data</span>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold text-foreground">{feeding.total} feeds</span>
                {isMultiDay && (
                  <span className="text-xs text-muted-foreground">avg {feeding.avgDaily}/day</span>
                )}
              </div>
            )}
          </div>
          {feeding.total > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(feeding.byType).map(([type, cnt]) => (
                  <span key={type} className="text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-100 rounded-full px-2 py-0.5">
                    {FEED_TYPE_LABELS[type] ?? type} × {cnt}
                  </span>
                ))}
              </div>
              {isMultiDay && (
                <MiniBarChart data={feeding.dailyBreakdown} valueKey="count" color={color} />
              )}
            </>
          )}
        </div>

        {/* Diapers */}
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <Baby size={13} className="text-amber-500" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diapers</span>
            </div>
            {diapers.total === 0 ? (
              <span className="text-xs text-muted-foreground italic">No data</span>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-bold text-foreground">{diapers.total} changes</span>
                {isMultiDay && (
                  <span className="text-xs text-muted-foreground">avg {diapers.avgDaily}/day</span>
                )}
              </div>
            )}
          </div>
          {diapers.total > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(diapers.byType).map(([type, cnt]) => (
                  <span key={type} className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5">
                    {DIAPER_TYPE_LABELS[type] ?? type} × {cnt}
                  </span>
                ))}
              </div>
              {isMultiDay && (
                <MiniBarChart data={diapers.dailyBreakdown} valueKey="count" color={color} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>("week");
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/stats?userId=${encodeURIComponent(user.id)}&period=${period}&date=${endDate}`);
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
  const isToday = endDate === todayStr;
  const isThisWeek = period === "week" && endDate === todayStr;
  const isThisMonth = period === "month" && endDate === todayStr;
  const atPresent = period === "day" ? isToday : period === "week" ? isThisWeek : isThisMonth;

  const PERIODS: { key: Period; label: string }[] = [
    { key: "day", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
  ];

  const endDateObj = toDateOnly(endDate);
  const hasAnyData = data?.twins.some(
    (t) => t.sleep.totalSessions > 0 || t.feeding.total > 0 || t.diapers.total > 0,
  );

  return (
    <Layout>
      <PageHeader title="Stats" subtitle="Track your twins' progress" />

      <div className="px-4 pb-4 space-y-4">
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
          <p className="text-sm font-semibold text-foreground">{dateLabel(period, endDateObj)}</p>
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
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-border h-48 animate-pulse" />
            ))}
          </div>
        ) : !data || data.twins.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📈</p>
            <p className="font-semibold text-foreground">No twins set up yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your twins in Settings to start tracking.</p>
          </div>
        ) : !hasAnyData ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-5xl">💕</p>
            <p className="font-semibold text-foreground">No data for this period</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Start logging sleep, feeding, and diapers and your stats will appear here — building over time.
            </p>
            <div className="flex flex-col items-center gap-1 mt-2">
              {["😴 Log some sleep", "🍼 Record a feed", "💧 Track a diaper change"].map((tip) => (
                <p key={tip} className="text-xs text-muted-foreground">{tip}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {data.twins.map((stat) => (
              <TwinStatCard key={stat.twin.id} stat={stat} period={period} />
            ))}

            <p className="text-center text-[10px] text-muted-foreground pt-1">
              {period === "day" ? "Today's summary" : period === "week" ? "Last 7 days" : "Last 30 days"} · Data updates live
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
