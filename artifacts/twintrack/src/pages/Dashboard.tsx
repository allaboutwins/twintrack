import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import Layout, { PageHeader } from "@/components/Layout";
import { Moon, Utensils, Baby, ChevronRight } from "lucide-react";
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

export default function Dashboard() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().split("T")[0];

  const { data: summary, isLoading } = useGetDashboardSummary(
    { userId: user?.id ?? "", date: today },
    { query: { enabled: !!user?.id, queryKey: getGetDashboardSummaryQueryKey({ userId: user?.id ?? "", date: today }) } },
  );

  const noTwins = !isLoading && (!summary?.twins || summary.twins.length === 0);

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
              <p className="text-sm text-muted-foreground mt-1">
                Add your twins' profiles to start tracking
              </p>
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
            {/* Twin header */}
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
                  <p className="text-xs text-muted-foreground">{ts.twin.label}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
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

            {/* Quick activity */}
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
              <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Last fed {formatTime(ts.lastFeeding.time)} — {ts.lastFeeding.feedingType}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Quick add buttons */}
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

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
