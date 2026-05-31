import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useListTwins,
  getListTwinsQueryKey,
  useListMilestones,
  getListMilestonesQueryKey,
  useGetActivePoll,
  getGetActivePollQueryKey,
  useRespondToPoll,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Moon, Utensils, Baby, ChevronRight, Star, Heart, BarChart2, Sparkles, X, Flame, Trophy } from "lucide-react";
import { posthog } from "@/lib/posthog";

import { Skeleton } from "@/components/ui/skeleton";

const MILESTONE_EMOJIS: Record<string, string> = {
  "first-smile": "😊",
  "first-laugh": "😂",
  "rolled-over": "🔄",
  "sat-up": "🧘",
  "crawled": "🐛",
  "first-tooth": "🦷",
  "first-word": "💬",
  "first-steps": "👣",
  "slept-through-night": "🌙",
  "first-daycare": "🎒",
  "first-birthday": "🎂",
  "potty-training": "🚽",
  "first-school": "🏫",
  "custom": "⭐",
};

function formatMilestoneDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function getAgeMonths(birthdate: string) {
  const bd = new Date(birthdate);
  const now = new Date();
  return (now.getFullYear() - bd.getFullYear()) * 12 + now.getMonth() - bd.getMonth();
}

function getAgeLabel(months: number) {
  if (months < 1) return "newborn";
  if (months < 6) return `${months} month${months === 1 ? "" : "s"} old`;
  if (months < 24) return `${months} months old`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} old`;
}

function getRoutineSuggestion() {
  const h = new Date().getHours();
  if (h < 10) return { label: "Morning Routine", emoji: "☀️", desc: "Start the day calm and organised" };
  if (h < 12) return { label: "Mid-Morning Check", emoji: "🍼", desc: "Time to check feeds and nap windows" };
  if (h < 14) return { label: "Lunchtime Routine", emoji: "🍽️", desc: "Meal prep and feeding time" };
  if (h < 17) return { label: "Afternoon Nap", emoji: "😴", desc: "Wind-down for afternoon nap" };
  if (h < 19) return { label: "Outing Window", emoji: "👜", desc: "Great time for a quick outing" };
  return { label: "Bedtime Routine", emoji: "🌙", desc: "Start winding down for the night" };
}

const TIPS = [
  "Syncing your twins' schedules is the single biggest life-changer.",
  "White noise mimics the womb — great for soothing both twins at once.",
  "Batch your diaper changes: if one needs it, check the other too.",
  "It's okay if one twin eats more. Appetite naturally varies between twins.",
  "You're doing an incredible job. Every day you show up is a win.",
  "Tandem nursing can save 1–2 hours a day. A twin pillow is worth it.",
  "Twin toddlers learn so much from watching each other. That's intentional development.",
];

function getDayTip() {
  return TIPS[new Date().getDate() % TIPS.length];
}

export default function Dashboard() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().split("T")[0];

  const { data: summary, isLoading } = useGetDashboardSummary(
    { userId: user?.id ?? "", date: today },
    { query: { enabled: !!user?.id, queryKey: getGetDashboardSummaryQueryKey({ userId: user?.id ?? "", date: today }) } },
  );

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const { data: milestones = [] } = useListMilestones(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListMilestonesQueryKey({ userId: user?.id ?? "" }) } },
  );

  const latestMilestone =
    milestones.length > 0
      ? [...milestones].sort((a, b) => new Date(b.achievedDate).getTime() - new Date(a.achievedDate).getTime())[0]
      : null;

  const noTwins = !isLoading && (!summary?.twins || summary.twins.length === 0);
  const routineSuggestion = getRoutineSuggestion();

  // Compute emotional value from today's data
  const totalFeedings = summary?.twins.reduce((acc, t) => acc + t.todayFeedingCount, 0) ?? 0;
  const totalDiapers = summary?.twins.reduce((acc, t) => acc + t.todayDiaperCount, 0) ?? 0;
  const totalSleepMins = summary?.twins.reduce((acc, t) => acc + t.todaySleepMinutes, 0) ?? 0;
  const hasGoodDay = totalFeedings >= 4 || totalDiapers >= 4 || totalSleepMins >= 180;

  // Streak tracking via localStorage
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (isLoading || noTwins) return;
    const today = new Date().toISOString().split("T")[0];
    const stored = (() => { try { return JSON.parse(localStorage.getItem("tt_streak") ?? "{}"); } catch { return {}; } })();
    const { lastDate, count } = stored as { lastDate?: string; count?: number };
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let newCount = 1;
    if (lastDate === today) {
      newCount = count ?? 1;
    } else if (lastDate === yesterday) {
      newCount = (count ?? 0) + 1;
    }
    if (lastDate !== today) {
      try { localStorage.setItem("tt_streak", JSON.stringify({ lastDate: today, count: newCount })); } catch { /* noop */ }
    }
    setStreak(newCount);
  }, [isLoading, noTwins]);

  return (
    <Layout>
      <PageHeader
        title={`Good ${getTimeOfDay()}`}
        subtitle={user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome back"}
        right={
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
          </span>
        }
      />

      <div className="px-4 space-y-4 pb-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        )}

        {noTwins && (
          <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Baby size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Set up your twins</h3>
              <p className="text-sm text-muted-foreground mt-1">Add your twins' profiles to start tracking</p>
            </div>
            <button
              onClick={() => setLocation("/settings")}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm"
              data-testid="button-setup-twins"
            >
              Set Up Twins
            </button>
          </div>
        )}

        {summary?.twins.map((ts) => (
          <div
            key={ts.twin.id}
            className="bg-white rounded-2xl border border-border overflow-hidden"
            data-testid={`dashboard-twin-${ts.twin.id}`}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: ts.twin.colorTheme + "18" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: ts.twin.colorTheme }}
                >
                  {(ts.twin.name || ts.twin.label).charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{ts.twin.name || ts.twin.label}</p>
                  {ts.twin.birthdate && (
                    <p className="text-xs text-muted-foreground">{getAgeLabel(getAgeMonths(ts.twin.birthdate))}</p>
                  )}
                  {!ts.twin.birthdate && (
                    <p className="text-xs text-muted-foreground">{ts.twin.label}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border">
              <StatCell
                icon={<Moon size={16} />}
                label="Sleep"
                value={formatMinutes(ts.todaySleepMinutes)}
                color={ts.twin.colorTheme}
                onClick={() => setLocation("/sleep")}
              />
              <StatCell
                icon={<Utensils size={16} />}
                label="Feedings"
                value={String(ts.todayFeedingCount)}
                color={ts.twin.colorTheme}
                onClick={() => setLocation("/feeding")}
              />
              <StatCell
                icon={<Baby size={16} />}
                label="Diapers"
                value={String(ts.todayDiaperCount)}
                color={ts.twin.colorTheme}
                onClick={() => setLocation("/diapers")}
              />
            </div>

            {ts.activeSleepEntry && (
              <div className="px-5 py-3 border-t border-border bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary">
                    Sleeping since {formatTime(ts.activeSleepEntry.startTime)}
                  </span>
                </div>
                <button
                  onClick={() => setLocation("/sleep")}
                  className="text-xs text-primary font-semibold flex items-center gap-0.5"
                  data-testid={`button-active-sleep-${ts.twin.id}`}
                >
                  Stop <ChevronRight size={12} />
                </button>
              </div>
            )}

            {ts.lastFeeding && !ts.activeSleepEntry && (
              <div className="px-5 py-3 border-t border-border bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  Last fed {formatTime(ts.lastFeeding.time)} — {ts.lastFeeding.feedingType}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Streak celebration */}
        {!noTwins && !isLoading && streak >= 3 && (
          <StreakCard streak={streak} />
        )}

        {/* Good day affirmation */}
        {!noTwins && !isLoading && hasGoodDay && streak < 3 && (
          <GoodDayCard feedings={totalFeedings} diapers={totalDiapers} sleepMins={totalSleepMins} />
        )}

        {/* What's New */}
        {!noTwins && !isLoading && <WhatsNewCard />}

        {/* For You Today */}
        {!noTwins && !isLoading && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">For You Today</p>

            {/* Tip of the day */}
            <div className="bg-gradient-to-br from-primary/8 to-secondary/8 rounded-2xl border border-primary/15 p-4 flex gap-3">
              <Star size={18} className="text-primary fill-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Twin Tip</p>
                <p className="text-sm text-foreground leading-relaxed">{getDayTip()}</p>
              </div>
            </div>

            {/* Routine suggestion */}
            <button
              onClick={() => setLocation("/routines")}
              className="w-full bg-white rounded-2xl border border-border p-4 flex items-center gap-4 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors"
              data-testid="routine-suggestion"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">
                {routineSuggestion.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{routineSuggestion.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{routineSuggestion.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
            </button>

            {/* Memories Card — always visible */}
            {latestMilestone ? (
              <button
                onClick={() => { posthog?.capture("memories_opened", { source: "home_card" }); setLocation("/milestones"); }}
                className="w-full bg-gradient-to-br from-primary/8 to-primary/4 rounded-2xl border border-primary/20 p-4 flex items-center gap-4 text-left hover:border-primary/35 active:scale-[0.99] transition-all"
                data-testid="memory-recap"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  {MILESTONE_EMOJIS[latestMilestone.category] ?? "💕"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Heart size={10} className="text-primary fill-primary" />
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Recent Memory</p>
                  </div>
                  <p className="font-semibold text-sm text-foreground leading-snug">{latestMilestone.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatMilestoneDate(latestMilestone.achievedDate)}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => { posthog?.capture("memories_opened", { source: "home_empty_cta" }); setLocation("/milestones"); }}
                className="w-full bg-gradient-to-br from-primary/8 to-primary/4 rounded-2xl border border-primary/20 p-4 flex items-center gap-4 text-left hover:border-primary/35 active:scale-[0.99] transition-all"
                data-testid="memory-recap-empty"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  💕
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Heart size={10} className="text-primary fill-primary" />
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Memories</p>
                  </div>
                  <p className="font-semibold text-sm text-foreground leading-snug">Log your first milestone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">First smile, first steps, first word — record it here 💕</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
            )}

            {/* Twin AI Promo */}
            <button
              onClick={() => { posthog?.capture("twin_ai_discovery_card_clicked"); setLocation("/twin-ai"); }}
              className="w-full bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl border border-violet-200/60 p-4 text-left hover:border-violet-300 active:scale-[0.99] transition-all"
              data-testid="twin-ai-promo"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} className="text-violet-500 flex-shrink-0" />
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">Ask Twin AI</p>
              </div>
              <p className="text-sm font-semibold text-foreground mb-2.5">Your AI twin parenting companion</p>
              <div className="flex flex-wrap gap-1.5">
                {["How do I sync twin naps?", "My twins wake each other up", "How much should my preemie twins eat?"].map((q) => (
                  <span key={q} className="text-[11px] bg-white/80 border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">{q}</span>
                ))}
              </div>
            </button>

          </div>
        )}

        {/* Poll widget */}
        {!noTwins && !isLoading && user?.id && (
          <PollWidget userId={user.id} />
        )}

        {/* Quick add */}
        {!noTwins && !isLoading && (
          <div className="grid grid-cols-2 gap-3">
            <QuickAddBtn label="Log Sleep" color="#da5a9f" onClick={() => setLocation("/sleep")} />
            <QuickAddBtn label="Log Feeding" color="#2e818c" onClick={() => setLocation("/feeding")} />
            <QuickAddBtn label="Log Diaper" color="#83b8c0" onClick={() => setLocation("/diapers")} />
            <QuickAddBtn label="Check Routines" color="#da5a9f" onClick={() => setLocation("/routines")} />
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── Emotional Value Cards ────────────────────────────────────────────────

const STREAK_MESSAGES: Record<number, { headline: string; body: string }> = {
  3: { headline: "3 days in a row! 🔥", body: "You've been showing up for your twins every single day. That consistency is everything." },
  5: { headline: "5-day streak! 🔥🔥", body: "Five consecutive days of tracking. Your dedication is inspiring — your twins are so lucky to have you." },
  7: { headline: "One full week! 🏆", body: "You've logged every day this week. A whole week of showing up. You're absolutely incredible." },
  14: { headline: "Two-week streak! 🏆", body: "Fourteen days of consistent tracking. Two weeks of love, care, and attention for your twins. You are amazing." },
  21: { headline: "21 days! 🌟", body: "Three weeks in a row. This is a habit now. You've built something beautiful for your family." },
  30: { headline: "30-day milestone! 🎉", body: "A full month of tracking! One month of showing up, day after day. This is extraordinary parenting." },
};

function getStreakMessage(streak: number) {
  const milestones = [30, 21, 14, 7, 5, 3];
  for (const m of milestones) {
    if (streak >= m) return STREAK_MESSAGES[m];
  }
  return null;
}

function StreakCard({ streak }: { streak: number }) {
  const today = new Date().toDateString();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("tt_streak_dismissed") === today; } catch { return false; }
  });
  const msg = getStreakMessage(streak);
  if (!msg || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem("tt_streak_dismissed", today); } catch {}
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-4 relative overflow-hidden" data-testid="streak-card">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-100/50 -mr-8 -mt-8" />
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-amber-400 hover:text-amber-600 transition-colors z-10"
        aria-label="Dismiss"
        data-testid="streak-card-dismiss"
      >
        <X size={13} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <Flame size={22} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-800 text-sm leading-tight">{msg.headline}</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">{msg.body}</p>
          <div className="flex items-center gap-1.5 mt-2.5">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <div key={i} className="w-5 h-1.5 rounded-full bg-amber-400" />
            ))}
            {streak > 7 && <span className="text-[10px] font-bold text-amber-500">+{streak - 7}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const GOOD_DAY_MESSAGES = [
  "You're doing beautifully today. Every diaper changed, every feed logged — that's love in action.",
  "Look at everything you've done today. Your twins are thriving because of you.",
  "Today's a great day in the books! Keep up the incredible work, twin parent.",
  "You're crushing it today. These little wins add up to something extraordinary.",
  "Your attention to your twins today is genuinely beautiful. You're an amazing parent.",
];

function GoodDayCard({ feedings, diapers, sleepMins }: { feedings: number; diapers: number; sleepMins: number }) {
  const today = new Date().toDateString();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("tt_goodday_dismissed") === today; } catch { return false; }
  });
  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem("tt_goodday_dismissed", today); } catch {}
  }

  const highlights = [
    feedings > 0 && `${feedings} feeding${feedings === 1 ? "" : "s"}`,
    diapers > 0 && `${diapers} diaper${diapers === 1 ? "" : "s"}`,
    sleepMins > 0 && `${Math.round(sleepMins / 60)}h sleep tracked`,
  ].filter(Boolean) as string[];

  const msg = GOOD_DAY_MESSAGES[new Date().getDate() % GOOD_DAY_MESSAGES.length];

  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/60 rounded-2xl p-4 relative" data-testid="good-day-card">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-rose-300 hover:text-rose-500 transition-colors"
        aria-label="Dismiss"
        data-testid="good-day-dismiss"
      >
        <X size={13} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-11 h-11 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0">
          <Heart size={20} className="text-rose-400 fill-rose-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-1">You're amazing</p>
          <p className="text-sm text-rose-800 leading-relaxed font-medium">{msg}</p>
          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {highlights.map((h) => (
                <span key={h} className="text-[10px] font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">{h}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const UPDATES_SEEN_KEY = "tt_updates_seen";

interface AppUpdateItem {
  id: number;
  emoji: string;
  title: string;
  description: string;
  publishedAt: string;
}

function WhatsNewCard() {
  const [dismissed, setDismissed] = useState(false);
  const [updates, setUpdates] = useState<AppUpdateItem[]>([]);
  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  useEffect(() => {
    fetch(`${baseUrl}/api/app-updates?limit=3`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AppUpdateItem[]) => {
        setUpdates(data);
        const lastSeen = localStorage.getItem(UPDATES_SEEN_KEY);
        if (lastSeen && !data.some((u) => new Date(u.publishedAt) > new Date(lastSeen))) {
          setDismissed(true);
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(UPDATES_SEEN_KEY, new Date().toISOString()); } catch { /* noop */ }
  }

  if (dismissed || updates.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-200/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-500" />
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">What's New</p>
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
          data-testid="whats-new-dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2.5">
        {updates.map((u) => (
          <div key={u.id} className="flex items-start gap-3">
            <span className="text-base flex-shrink-0 mt-0.5">{u.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-foreground leading-snug">{u.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{u.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PollWidget({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: poll } = useGetActivePoll(
    { userId },
    {
      query: {
        enabled: !!userId,
        queryKey: getGetActivePollQueryKey({ userId }),
        retry: false,
        staleTime: 60 * 1000,
      },
    },
  );
  const respond = useRespondToPoll();

  if (!poll) return null;

  function vote(optionKey: string) {
    if (!poll || poll.hasResponded) return;
    posthog?.capture("poll_voted", { pollId: poll.id, optionKey });
    respond.mutate(
      { id: poll.id, data: { userId, optionKey } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getGetActivePollQueryKey({ userId }) }) },
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 size={15} className="text-primary" />
        <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Twin Mom Poll</p>
      </div>
      <p className="font-semibold text-sm text-foreground leading-snug">{poll.question}</p>
      {!poll.hasResponded ? (
        <div className="space-y-2">
          {poll.options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => vote(opt.key)}
              disabled={respond.isPending}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left border border-border bg-muted/20 hover:bg-primary/8 hover:border-primary/30 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {poll.results?.breakdown.map((item) => {
            const opt = poll.options.find((o) => o.key === item.optionKey);
            const isUser = item.optionKey === poll.userOptionKey;
            return (
              <div key={item.optionKey}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${isUser ? "text-primary" : "text-foreground"}`}>
                    {isUser ? "✓ " : ""}{opt?.label ?? item.optionKey}
                  </span>
                  <span className="text-muted-foreground">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isUser ? "bg-primary" : "bg-muted-foreground/40"}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            {poll.results?.totalResponses ?? 0} twin {poll.results?.totalResponses === 1 ? "mom" : "moms"} voted 💕
          </p>
        </div>
      )}
      <div className="pt-1 border-t border-border/50 flex justify-end">
        <button
          onClick={() => setLocation("/learn?tab=community")}
          className="text-xs text-primary font-semibold flex items-center gap-0.5 py-1"
        >
          View older polls <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center py-4 gap-1 hover:bg-muted/30 active:bg-muted/50 transition-colors"
    >
      <span style={{ color }}>{icon}</span>
      <span className="text-lg font-bold text-foreground">{value || "—"}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

function QuickAddBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="py-4 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-all shadow-sm"
      style={{ backgroundColor: color }}
      data-testid={`quick-add-${label.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {label}
    </button>
  );
}
