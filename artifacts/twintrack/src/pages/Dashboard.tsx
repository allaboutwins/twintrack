import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useListTwins,
  getListTwinsQueryKey,
  useListVideos,
  getListVideosQueryKey,
} from "@workspace/api-client-react";
import Layout, { PageHeader } from "@/components/Layout";
import { Moon, Utensils, Baby, ChevronRight, Play, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
