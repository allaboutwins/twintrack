import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { RefreshCw, Users, MessageCircle, BarChart2, Activity, Copy, Check } from "lucide-react";

interface Breakdown {
  key: string;
  value: number;
}
interface FeedbackEntry {
  id: number;
  userId: string | null;
  feedbackType: string;
  message: string;
  metadata: string | null;
  createdAt: string;
}
interface AdminStats {
  users: {
    uniqueUsersWithTwins: number;
    onboardingTotal: number;
    onboardingCompleted: number;
  };
  onboarding: {
    parentStatus: Breakdown[];
    multipleType: Breakdown[];
    babyAgeGroup: Breakdown[];
    isPremature: Breakdown[];
    biggestChallenge: Breakdown[];
    featureInterest: Breakdown[];
  };
  feedback: FeedbackEntry[];
  activity: {
    sleepEntries: number;
    feedingEntries: number;
    diaperEntries: number;
    milestones: number;
    bookmarks: number;
    videoNotes: number;
  };
}

const CHALLENGE_LABELS: Record<string, string> = {
  sleep: "😴 Sleep deprivation",
  feeding: "🍼 Feeding two at once",
  time: "⏰ Finding time",
  schedules: "📅 Managing schedules",
  "mental-health": "🧠 Mental health",
  support: "🤝 Feeling supported",
  other: "💬 Other",
  unknown: "❓ Not answered",
};

const FEATURE_LABELS: Record<string, string> = {
  "sleep-tracker": "😴 Sleep Tracker",
  "feeding-log": "🍼 Feeding Log",
  milestones: "💕 Milestones",
  learn: "🎓 Learn Videos",
  routines: "📋 Routines",
  all: "✨ All of it!",
  unknown: "❓ Not answered",
};

const PARENT_LABELS: Record<string, string> = {
  expecting: "🤰 Expecting",
  parenting: "👶 Parenting",
  unknown: "❓ Unknown",
};

const AGE_LABELS: Record<string, string> = {
  newborn: "🐣 Newborn (0–3m)",
  infant: "🍼 Infant (3–12m)",
  toddler: "🧒 Toddler (1–3y)",
  older: "🌟 Older (3+)",
  unknown: "❓ Unknown",
};

const MULTIPLES_LABELS: Record<string, string> = {
  twins: "👯 Twins",
  triplets: "🌟 Triplets",
  quads: "🍀 Quads",
  other: "💫 Other",
  unknown: "❓ Unknown",
};

const FEEDBACK_STYLES: Record<string, string> = {
  bug: "bg-red-50 text-red-700 border-red-100",
  feature: "bg-blue-50 text-blue-700 border-blue-100",
  feedback: "bg-purple-50 text-purple-700 border-purple-100",
  confusion: "bg-orange-50 text-orange-700 border-orange-100",
  love: "bg-pink-50 text-pink-700 border-pink-100",
};

const FEEDBACK_ICONS: Record<string, string> = {
  bug: "🐛",
  feature: "💡",
  feedback: "💬",
  confusion: "😕",
  love: "💕",
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-border flex flex-col gap-1">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BreakdownBars({
  items,
  labels,
  color = "bg-primary",
}: {
  items: Breakdown[];
  labels?: Record<string, string>;
  color?: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <p className="text-xs text-muted-foreground italic">No data yet</p>;
  return (
    <div className="space-y-2.5">
      {items.slice(0, 7).map(({ key, value }) => {
        const pct = total ? Math.round((value / total) * 100) : 0;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground font-medium">{labels?.[key] ?? key}</span>
              <span className="text-muted-foreground">
                {value} · {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      <h2 className="font-bold text-foreground text-base">{title}</h2>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Admin() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const userId = user?.id ?? "";

  const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const isAdmin = !!userId && adminIds.includes(userId);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  async function fetchStats() {
    if (!isAdmin || !userId) return;
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/admin/stats?userId=${encodeURIComponent(userId)}`);
      if (!r.ok) throw new Error(`${r.status}`);
      setStats(await r.json());
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Admin fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin, userId]);

  // Not signed in state handled by route
  if (!userId) return null;

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center max-w-[430px] mx-auto">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Admin Access Required</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Your user ID is not on the admin list. To gain access, add your ID to the{" "}
          <code className="bg-muted px-1 rounded text-xs">VITE_ADMIN_USER_IDS</code> and{" "}
          <code className="bg-muted px-1 rounded text-xs">ADMIN_USER_IDS</code> environment variables.
        </p>
        <div className="bg-muted/50 border border-border rounded-2xl p-4 w-full text-left mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Your User ID</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs font-mono text-foreground break-all">{userId}</code>
            <CopyButton text={userId} />
          </div>
        </div>
        <button
          onClick={() => setLocation("/dashboard")}
          className="text-sm text-primary font-semibold"
        >
          ← Back to app
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted/30 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🍒</span>
              <h1 className="text-lg font-bold text-foreground">TwinTrack Admin</h1>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold disabled:opacity-50 transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center pt-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : stats ? (
        <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
          {/* ── USERS ── */}
          <section>
            <SectionHeader icon={<Users size={16} />} title="Users" />
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Users with twins"
                value={stats.users.uniqueUsersWithTwins}
                sub="unique accounts"
              />
              <StatCard
                label="Onboarding done"
                value={stats.users.onboardingCompleted}
                sub={`of ${stats.users.onboardingTotal} started`}
              />
              <StatCard
                label="Completion rate"
                value={
                  stats.users.onboardingTotal
                    ? `${Math.round((stats.users.onboardingCompleted / stats.users.onboardingTotal) * 100)}%`
                    : "—"
                }
                sub="onboarding"
              />
            </div>
          </section>

          {/* ── ONBOARDING INSIGHTS ── */}
          <section>
            <SectionHeader icon={<BarChart2 size={16} />} title="Onboarding Insights" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Parent Status
                </p>
                <BreakdownBars items={stats.onboarding.parentStatus} labels={PARENT_LABELS} />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Multiple Type
                </p>
                <BreakdownBars items={stats.onboarding.multipleType} labels={MULTIPLES_LABELS} color="bg-accent" />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Baby Age Group
                </p>
                <BreakdownBars items={stats.onboarding.babyAgeGroup} labels={AGE_LABELS} color="bg-[#2e818c]" />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Prematurity
                </p>
                <BreakdownBars
                  items={stats.onboarding.isPremature}
                  labels={{ true: "💛 Premature", false: "✅ Full term", unknown: "❓ Not answered" }}
                  color="bg-amber-400"
                />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Biggest Challenge
                </p>
                <BreakdownBars items={stats.onboarding.biggestChallenge} labels={CHALLENGE_LABELS} />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Feature Interest
                </p>
                <BreakdownBars
                  items={stats.onboarding.featureInterest}
                  labels={FEATURE_LABELS}
                  color="bg-[#2e818c]"
                />
              </div>
            </div>
          </section>

          {/* ── FEEDBACK ── */}
          <section>
            <SectionHeader icon={<MessageCircle size={16} />} title="Feedback Center" />
            {/* Type summary */}
            {stats.feedback.length > 0 && (() => {
              const byType = stats.feedback.reduce((acc, f) => {
                acc[f.feedbackType] = (acc[f.feedbackType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              return (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(byType).map(([type, cnt]) => (
                    <span
                      key={type}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${FEEDBACK_STYLES[type] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {FEEDBACK_ICONS[type] ?? "📝"} {type} ({cnt})
                    </span>
                  ))}
                </div>
              );
            })()}
            {stats.feedback.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-border text-center text-sm text-muted-foreground">
                No feedback yet 🍒 — it'll come!
              </div>
            ) : (
              <div className="space-y-3">
                {stats.feedback.map((f) => (
                  <div key={f.id} className="bg-white rounded-2xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${FEEDBACK_STYLES[f.feedbackType] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {FEEDBACK_ICONS[f.feedbackType] ?? "📝"} {f.feedbackType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{f.message}</p>
                    {f.userId && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{f.userId.slice(0, 20)}…</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── ACTIVITY ── */}
          <section>
            <SectionHeader icon={<Activity size={16} />} title="App Activity" />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Sleep entries" value={stats.activity.sleepEntries} />
              <StatCard label="Feeding entries" value={stats.activity.feedingEntries} />
              <StatCard label="Diaper entries" value={stats.activity.diaperEntries} />
              <StatCard label="Milestones" value={stats.activity.milestones} />
              <StatCard label="Video saves" value={stats.activity.bookmarks} />
              <StatCard label="Video notes" value={stats.activity.videoNotes} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
