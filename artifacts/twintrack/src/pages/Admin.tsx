import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { RefreshCw, Users, MessageCircle, BarChart2, Activity, Copy, Check, Star, CheckCircle2, Filter, Sheet, Plus, Trash2 } from "lucide-react";

interface Breakdown { key: string; value: number; }
interface FeedbackEntry {
  id: number;
  userId: string | null;
  feedbackType: string;
  message: string;
  metadata: string | null;
  isStarred: boolean;
  isResolved: boolean;
  createdAt: string;
}
interface AdminStats {
  users: { uniqueUsersWithTwins: number; onboardingTotal: number; onboardingCompleted: number; ambassadors: number; };
  onboarding: {
    parentStatus: Breakdown[]; multipleType: Breakdown[]; babyAgeGroup: Breakdown[];
    isPremature: Breakdown[]; biggestChallenge: Breakdown[]; featureInterest: Breakdown[];
    discoverySource: Breakdown[];
  };
  feedback: FeedbackEntry[];
  activity: { sleepEntries: number; feedingEntries: number; diaperEntries: number; milestones: number; bookmarks: number; videoNotes: number; };
}

interface BackfillResult { success: number; failed: number; skipped: number; }

interface PollOption { key: string; label: string; }

const LABELS: Record<string, Record<string, string>> = {
  challenge: { sleep:"😴 Sleep deprivation", feeding:"🍼 Feeding two at once", time:"⏰ Finding time", schedules:"📅 Schedules", "mental-health":"🧠 Mental health", support:"🤝 Support", other:"💬 Other", unknown:"❓ N/A" },
  feature: { "sleep-tracker":"😴 Sleep Tracker", "feeding-log":"🍼 Feeding Log", milestones:"💕 Milestones", learn:"🎓 Learn Videos", routines:"📋 Routines", all:"✨ All of it!", unknown:"❓ N/A" },
  parent: { expecting:"🤰 Expecting", parenting:"👶 Parenting", unknown:"❓ Unknown" },
  age: { newborn:"🐣 Newborn (0–3m)", infant:"🍼 Infant (3–12m)", toddler:"🧒 Toddler (1–3y)", older:"🌟 Older (3+)", unknown:"❓ Unknown" },
  multiples: { twins:"👯 Twins", triplets:"🌟 Triplets", quads:"🍀 Quads", other:"💫 Other", unknown:"❓ Unknown" },
  discovery: { instagram:"📸 Instagram", facebook:"👥 Facebook", tiktok:"🎵 TikTok", youtube:"▶️ YouTube", threads:"🧵 Threads", pinterest:"📌 Pinterest", friend:"🤝 Friend", allaboutwins:"🍒 All About Twins", other:"💬 Other", unknown:"❓ N/A" },
  premature: { true:"💛 Premature", false:"✅ Full term", unknown:"❓ N/A" },
};

const FB_STYLE: Record<string, string> = {
  bug:"bg-red-50 text-red-700 border-red-100", feature:"bg-blue-50 text-blue-700 border-blue-100",
  feedback:"bg-purple-50 text-purple-700 border-purple-100", confusion:"bg-orange-50 text-orange-700 border-orange-100",
  love:"bg-pink-50 text-pink-700 border-pink-100",
};
const FB_ICON: Record<string, string> = { bug:"🐛", feature:"💡", feedback:"💬", confusion:"😕", love:"💕" };

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border flex flex-col gap-1 ${accent ? "bg-primary/10 border-primary/20" : "bg-white border-border"}`}>
      <p className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BreakdownBars({ items, labels, color = "bg-primary" }: { items: Breakdown[]; labels?: Record<string, string>; color?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <p className="text-xs text-muted-foreground italic">No data yet 🍒</p>;
  return (
    <div className="space-y-2.5">
      {items.slice(0, 8).map(({ key, value }) => {
        const pct = total ? Math.round((value / total) * 100) : 0;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground font-medium">{labels?.[key] ?? key}</span>
              <span className="text-muted-foreground">{value} · {pct}%</span>
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

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
      {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Admin() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const userId = user?.id ?? "";
  const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const isAdmin = !!userId && adminIds.includes(userId);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [fbFilter, setFbFilter] = useState<string>("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);

  // Sheets backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  // Poll creation state
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollCategory, setPollCategory] = useState("community");
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { key: "a", label: "" },
    { key: "b", label: "" },
    { key: "c", label: "" },
  ]);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollSuccess, setPollSuccess] = useState(false);

  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const fetchStats = useCallback(async () => {
    if (!isAdmin || !userId) return;
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/admin/stats?userId=${encodeURIComponent(userId)}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data: AdminStats = await r.json();
      setStats(data);
      setFeedback(data.feedback);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAdmin, userId, baseUrl]);

  useEffect(() => { if (isAdmin) fetchStats(); }, [fetchStats]);

  async function backfillSheets() {
    setIsBackfilling(true);
    setBackfillResult(null);
    setBackfillError(null);
    try {
      const r = await fetch(`${baseUrl}/api/admin/backfill-sheets?userId=${encodeURIComponent(userId)}`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result: BackfillResult = await r.json();
      setBackfillResult(result);
    } catch (e) {
      setBackfillError(String(e));
    } finally {
      setIsBackfilling(false);
    }
  }

  async function createPoll() {
    const validOptions = pollOptions.filter((o) => o.label.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    setIsCreatingPoll(true);
    try {
      const r = await fetch(`${baseUrl}/api/admin/polls?userId=${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pollQuestion.trim(),
          category: pollCategory,
          options: JSON.stringify(validOptions.map((o, i) => ({ key: o.key || String.fromCharCode(97 + i), label: o.label.trim() }))),
          isActive: true,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPollSuccess(true);
      setPollQuestion("");
      setPollOptions([{ key: "a", label: "" }, { key: "b", label: "" }, { key: "c", label: "" }]);
      setShowPollForm(false);
      setTimeout(() => setPollSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingPoll(false);
    }
  }

  async function toggleStar(id: number) {
    const r = await fetch(`${baseUrl}/api/feedback/${id}/star?userId=${encodeURIComponent(userId)}`, { method: "PATCH" });
    if (r.ok) {
      const updated: FeedbackEntry = await r.json();
      setFeedback((prev) => prev.map((f) => f.id === id ? updated : f));
    }
  }

  async function toggleResolve(id: number) {
    const r = await fetch(`${baseUrl}/api/feedback/${id}/resolve?userId=${encodeURIComponent(userId)}`, { method: "PATCH" });
    if (r.ok) {
      const updated: FeedbackEntry = await r.json();
      setFeedback((prev) => prev.map((f) => f.id === id ? updated : f));
    }
  }

  if (!userId) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center max-w-[430px] mx-auto">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Admin Access Required</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Your user ID is not on the admin list. Add it to <code className="bg-muted px-1 rounded text-xs">VITE_ADMIN_USER_IDS</code> and <code className="bg-muted px-1 rounded text-xs">ADMIN_USER_IDS</code>.
        </p>
        <div className="bg-muted/50 border border-border rounded-2xl p-4 w-full text-left mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Your User ID</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-xs font-mono text-foreground break-all">{userId}</code>
            <CopyBtn text={userId} />
          </div>
        </div>
        <button onClick={() => setLocation("/dashboard")} className="text-sm text-primary font-semibold">← Back to app</button>
      </div>
    );
  }

  const filteredFeedback = feedback.filter((f) => {
    if (fbFilter !== "all" && f.feedbackType !== fbFilter) return false;
    if (showStarredOnly && !f.isStarred) return false;
    if (showUnresolvedOnly && f.isResolved) return false;
    return true;
  });

  const fbTypeCounts = feedback.reduce((acc, f) => { acc[f.feedbackType] = (acc[f.feedbackType] || 0) + 1; return acc; }, {} as Record<string, number>);

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
            {lastUpdated && <p className="text-xs text-muted-foreground">Updated {lastUpdated.toLocaleTimeString()}</p>}
          </div>
          <button onClick={fetchStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold disabled:opacity-50 transition-all">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />Refresh
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Users with twins" value={stats.users.uniqueUsersWithTwins} sub="unique accounts" />
              <StatCard label="Onboarding done" value={stats.users.onboardingCompleted} sub={`of ${stats.users.onboardingTotal} started`} />
              <StatCard label="Completion rate" value={stats.users.onboardingTotal ? `${Math.round((stats.users.onboardingCompleted / stats.users.onboardingTotal) * 100)}%` : "—"} sub="onboarding" />
              <StatCard label="Ambassadors 💕" value={stats.users.ambassadors} sub="want to help" accent />
            </div>
          </section>

          {/* ── GOOGLE SHEETS SYNC ── */}
          <section>
            <SectionHeader icon={<Sheet size={16} />} title="Google Sheets Sync" />
            <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
              <div>
                <p className="text-sm text-foreground font-medium mb-1">Backfill Onboarding Records</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Syncs all completed onboarding records to the Google Sheet tab "Onboarding". 
                  Use this if new signups aren't appearing in the sheet. Check API server logs for details.
                </p>
              </div>

              {backfillResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
                  <p className="font-semibold text-green-800 mb-1">✓ Backfill complete</p>
                  <p className="text-green-700 text-xs">
                    {backfillResult.success} synced · {backfillResult.failed} failed · {backfillResult.skipped} skipped
                  </p>
                </div>
              )}

              {backfillError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {backfillError}
                </div>
              )}

              <button
                onClick={backfillSheets}
                disabled={isBackfilling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                <RefreshCw size={14} className={isBackfilling ? "animate-spin" : ""} />
                {isBackfilling ? "Syncing records…" : "Run Backfill Now"}
              </button>

              <p className="text-xs text-muted-foreground">
                ⚡ Requires <code className="bg-muted px-1 rounded">GOOGLE_SHEET_ID</code> env var. 
                Watch the API server logs for step-by-step output.
              </p>
            </div>
          </section>

          {/* ── COMMUNITY POLLS ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <BarChart2 size={16} />
                </div>
                <h2 className="font-bold text-foreground text-base">Community Polls</h2>
              </div>
              <button
                onClick={() => { setShowPollForm((v) => !v); setPollSuccess(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold"
              >
                <Plus size={13} />{showPollForm ? "Cancel" : "New Poll"}
              </button>
            </div>

            {pollSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium mb-4">
                ✓ Poll created and activated!
              </div>
            )}

            {showPollForm && (
              <div className="bg-white rounded-2xl border border-border p-5 space-y-4 mb-4">
                <p className="text-sm font-semibold text-foreground">Create New Poll</p>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question</label>
                  <textarea
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. What's your biggest twin mom challenge?"
                    rows={2}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                  <input
                    value={pollCategory}
                    onChange={(e) => setPollCategory(e.target.value)}
                    placeholder="community"
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Options (at least 2)
                  </label>
                  <div className="space-y-2">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-4">{opt.key}</span>
                        <input
                          value={opt.label}
                          onChange={(e) => {
                            const next = [...pollOptions];
                            next[i] = { ...next[i], label: e.target.value };
                            setPollOptions(next);
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                            className="p-1.5 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setPollOptions([...pollOptions, { key: String.fromCharCode(97 + pollOptions.length), label: "" }])}
                      className="text-xs text-primary font-semibold flex items-center gap-1 pt-1"
                    >
                      <Plus size={12} /> Add option
                    </button>
                  </div>
                </div>

                <button
                  onClick={createPoll}
                  disabled={isCreatingPoll || !pollQuestion.trim() || pollOptions.filter((o) => o.label.trim()).length < 2}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isCreatingPoll ? "Creating…" : "Create & Activate Poll"}
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">
                Active polls appear on the Dashboard for all users. 
                Creating a new poll here will mark it active. 
                Use the database to deactivate old polls when rotating new ones.
              </p>
            </div>
          </section>

          {/* ── ONBOARDING INSIGHTS ── */}
          <section>
            <SectionHeader icon={<BarChart2 size={16} />} title="Onboarding Insights" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">How They Found Us 🔍</p>
                <BreakdownBars items={stats.onboarding.discoverySource} labels={LABELS.discovery} color="bg-primary" />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Multiple Type</p>
                <BreakdownBars items={stats.onboarding.multipleType} labels={LABELS.multiples} color="bg-accent" />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Biggest Challenge</p>
                <BreakdownBars items={stats.onboarding.biggestChallenge} labels={LABELS.challenge} />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Feature Interest</p>
                <BreakdownBars items={stats.onboarding.featureInterest} labels={LABELS.feature} color="bg-[#2e818c]" />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Baby Age Group</p>
                <BreakdownBars items={stats.onboarding.babyAgeGroup} labels={LABELS.age} color="bg-[#2e818c]" />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Prematurity</p>
                <BreakdownBars items={stats.onboarding.isPremature} labels={LABELS.premature} color="bg-amber-400" />
              </div>
            </div>
          </section>

          {/* ── FEEDBACK CENTER ── */}
          <section>
            <SectionHeader icon={<MessageCircle size={16} />} title="Feedback Center" />

            <div className="bg-white rounded-2xl p-3 border border-border mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFbFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${fbFilter === "all" ? "bg-foreground text-background border-foreground" : "bg-muted text-muted-foreground border-transparent"}`}>
                  All ({feedback.length})
                </button>
                {Object.entries(fbTypeCounts).map(([type, cnt]) => (
                  <button key={type} onClick={() => setFbFilter(type)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${fbFilter === type ? `${FB_STYLE[type] ?? "bg-muted"} font-bold` : "bg-muted text-muted-foreground border-transparent"}`}>
                    {FB_ICON[type] ?? "📝"} {type} ({cnt})
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowStarredOnly((v) => !v)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${showStarredOnly ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-transparent"}`}>
                  <Star size={11} />Starred only
                </button>
                <button onClick={() => setShowUnresolvedOnly((v) => !v)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${showUnresolvedOnly ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-transparent"}`}>
                  <Filter size={11} />Unresolved only
                </button>
                <span className="ml-auto text-xs text-muted-foreground self-center">{filteredFeedback.length} shown</span>
              </div>
            </div>

            {filteredFeedback.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-border text-center text-sm text-muted-foreground">
                {feedback.length === 0 ? "No feedback yet 🍒 — it'll come!" : "No feedback matches the current filters."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map((f) => (
                  <div key={f.id} className={`bg-white rounded-2xl p-4 border transition-all ${f.isResolved ? "opacity-60 border-border" : "border-border"} ${f.isStarred ? "ring-2 ring-amber-300" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${FB_STYLE[f.feedbackType] ?? "bg-muted text-muted-foreground"}`}>
                        {FB_ICON[f.feedbackType] ?? "📝"} {f.feedbackType}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <button onClick={() => toggleStar(f.id)} title="Star"
                          className={`p-1 rounded-lg transition-colors ${f.isStarred ? "text-amber-500 bg-amber-50" : "text-muted-foreground hover:text-amber-400"}`}>
                          <Star size={14} fill={f.isStarred ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => toggleResolve(f.id)} title="Mark resolved"
                          className={`p-1 rounded-lg transition-colors ${f.isResolved ? "text-green-600 bg-green-50" : "text-muted-foreground hover:text-green-500"}`}>
                          <CheckCircle2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{f.message}</p>
                    {f.isResolved && <p className="text-xs text-green-600 font-semibold mt-1.5">✓ Resolved</p>}
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
