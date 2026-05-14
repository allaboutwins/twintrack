import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useListTwins,
  getListTwinsQueryKey,
  useListVideos,
  getListVideosQueryKey,
  useListMilestones,
  getListMilestonesQueryKey,
  useGetActivePoll,
  getGetActivePollQueryKey,
  useRespondToPoll,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Moon, Utensils, Baby, ChevronRight, Play, Star, Heart, BarChart2, Sparkles, X } from "lucide-react";

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

function getRecommendedCategory(months: number) {
  if (months < 3) return "sleep";
  if (months < 6) return "feeding";
  if (months < 12) return "breastfeeding-twins";
  if (months < 24) return "routines";
  return "toddler-life";
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

  const birthdateSample = twins[0]?.birthdate;
  const twinAgeMonths = birthdateSample ? getAgeMonths(birthdateSample) : null;
  const recommendedCategory = twinAgeMonths != null ? getRecommendedCategory(twinAgeMonths) : "sleep";

  const { data: recommendedVideos = [] } = useListVideos(
    { category: recommendedCategory },
    {
      query: {
        enabled: true,
        queryKey: getListVideosQueryKey({ category: recommendedCategory }),
      },
    },
  );

  const { data: milestones = [] } = useListMilestones(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListMilestonesQueryKey({ userId: user?.id ?? "" }) } },
  );

  const latestMilestone =
    milestones.length > 0
      ? [...milestones].sort((a, b) => new Date(b.achievedDate).getTime() - new Date(a.achievedDate).getTime())[0]
      : null;

  const featuredVideo = recommendedVideos[0] ?? null;
  const noTwins = !isLoading && (!summary?.twins || summary.twins.length === 0);
  const routineSuggestion = getRoutineSuggestion();

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

            {/* Memory Recap */}
            {latestMilestone && (
              <button
                onClick={() => setLocation("/milestones")}
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
            )}

            {/* Recommended video */}
            {featuredVideo && (
              <button
                onClick={() => setLocation("/learn")}
                className="w-full bg-white rounded-2xl border border-border overflow-hidden text-left hover:shadow-sm active:scale-[0.99] transition-all"
                data-testid="featured-video"
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {featuredVideo.thumbnailUrl ? (
                    <img
                      src={featuredVideo.thumbnailUrl}
                      alt={featuredVideo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play size={20} className="text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="bg-primary text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {twinAgeMonths != null
                        ? `Recommended for ${getAgeLabel(twinAgeMonths)} twins`
                        : "Recommended"}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-sm text-foreground leading-snug">{featuredVideo.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span>Tap to watch in Learn</span>
                    <ChevronRight size={12} />
                  </p>
                </div>
              </button>
            )}
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

const WHATS_NEW_ITEMS = [
  { emoji: "✏️", title: "Edit tracking entries", desc: "Tap the pencil on any sleep, feeding, or diaper entry to correct it." },
  { emoji: "📚", title: "Twins Magazine Library", desc: "11 issues of Twins Magazine now in the Learn tab — tap to read!" },
  { emoji: "👶", title: "Weekly sleep average", desc: "Your sleep summary now shows a 7-day daily average." },
];
const WHATS_NEW_KEY = "whats_new_dismissed_v3";

function WhatsNewCard() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(WHATS_NEW_KEY) === "1"; } catch { return false; }
  });

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-200/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-violet-500" />
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">What's New</p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            try { localStorage.setItem(WHATS_NEW_KEY, "1"); } catch { /* noop */ }
          }}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
          data-testid="whats-new-dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2.5">
        {WHATS_NEW_ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="text-base flex-shrink-0 mt-0.5">{item.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PollWidget({ userId }: { userId: string }) {
  const qc = useQueryClient();
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
