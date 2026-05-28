import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { RefreshCw, Users, MessageCircle, BarChart2, Activity, Copy, Check, Star, CheckCircle2, Filter, Sheet, Plus, Trash2, Mail, Lock, Download, BarChart, Sparkles, Zap, Instagram, Bell, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar } from "recharts";

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
interface EmailEntry {
  userId: string;
  email: string;
  newsletterConsent: boolean;
  createdAt: string;
  instagramHandle?: string | null;
  babyAgeGroup?: string | null;
}
interface PollStat {
  id: number;
  question: string;
  category: string;
  options: string;
  isActive: boolean;
  createdAt: string;
  totalResponses: number;
}
interface AdminStats {
  users: {
    uniqueUsersWithTwins: number;
    onboardingTotal: number;
    onboardingCompleted: number;
    ambassadors: number;
    emailsCaptured: number;
    newsletterSubscribers: number;
  };
  onboarding: {
    parentStatus: Breakdown[]; multipleType: Breakdown[]; babyAgeGroup: Breakdown[];
    isPremature: Breakdown[]; biggestChallenge: Breakdown[]; featureInterest: Breakdown[];
    discoverySource: Breakdown[];
  };
  feedback: FeedbackEntry[];
  activity: { sleepEntries: number; feedingEntries: number; diaperEntries: number; milestones: number; bookmarks: number; videoNotes: number; };
  emails: EmailEntry[];
  polls: PollStat[];
}

interface AppUpdateItem {
  id: number;
  title: string;
  description: string;
  emoji: string;
  publishedAt: string;
}

interface NotificationStats {
  totalSubscribers: number;
  uniqueSubscribedUsers: number;
  totalSent: number;
  totalOpened: number;
  openRate: number;
  byType: Record<string, { sent: number; opened: number }>;
}

interface RetentionData {
  days: number;
  dau: { date: string; users: number }[];
  wau: { users: number }[];
  pushSubsByDay: { date: string; subs: number }[];
  notifByDay: { date: string; sent: number; opened: number; rate: number }[];
  signupsByDay: { date: string; signups: number }[];
  totals: { pushSubscribers: number; onboardedUsers: number; pushOptInRate: number };
}

interface TwinAiAnalytics {
  totalMessages: number;
  todayMessages: number;
  uniqueUsers: number;
  avgPerUser: number;
  helpfulCount: number;
  notHelpfulCount: number;
  categoryBreakdown: { key: string; value: number }[];
  topQuestions: { question: string; count: number }[];
  dailyUsage: { date: string; count: number }[];
}

interface PollOption { key: string; label: string; }

interface LiveUserEntry {
  userId: string;
  lastSeen: string;
  currentPage: string;
  minutesAgo: number;
}
interface LiveUsersData {
  online: LiveUserEntry[];
  recent: LiveUserEntry[];
  lastHour: LiveUserEntry[];
  total: number;
}

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

function exportEmailsCSV(emails: EmailEntry[]) {
  const header = "Email,Newsletter Consent,Joined";
  const rows = emails.map((e) => `${e.email},${e.newsletterConsent ? "Yes" : "No"},${new Date(e.createdAt).toLocaleDateString()}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `twintrack-emails-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const userId = user?.id ?? "";
  const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const isAdminById = !!userId && adminIds.includes(userId);

  const [adminPassword, setAdminPassword] = useState<string>(() => sessionStorage.getItem("tt_admin_pw") ?? "");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? "";
  const isAdminByPassword = !!adminPassword && !!envPassword && adminPassword === envPassword;
  const isAdmin = isAdminById || isAdminByPassword;

  const authQuery = isAdminById
    ? `userId=${encodeURIComponent(userId)}`
    : `adminPassword=${encodeURIComponent(adminPassword)}`;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [fbFilter, setFbFilter] = useState<string>("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [showAllPolls, setShowAllPolls] = useState(false);
  const [showAllFeedback, setShowAllFeedback] = useState(false);

  const [notificationStats, setNotificationStats] = useState<NotificationStats | null>(null);
  const [twinAiAnalytics, setTwinAiAnalytics] = useState<TwinAiAnalytics | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [liveUsers, setLiveUsers] = useState<LiveUsersData | null>(null);
  const [appUpdatesList, setAppUpdatesList] = useState<AppUpdateItem[]>([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateDesc, setUpdateDesc] = useState("");
  const [updateEmoji, setUpdateEmoji] = useState("🍒");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollCategory, setPollCategory] = useState("community");
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { key: "a", label: "" }, { key: "b", label: "" }, { key: "c", label: "" },
  ]);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollSuccess, setPollSuccess] = useState(false);

  const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    // _t busts any remaining HTTP cache layer; cache:'no-store' tells the
    // browser to bypass its own cache and never store the response.
    const t = Date.now();
    try {
      const [statsRes, aiRes, updatesRes, notifRes, retentionRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/stats?${authQuery}&_t=${t}`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/admin/twin-ai-analytics?${authQuery}&_t=${t}`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/app-updates?limit=50&_t=${t}`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/admin/notifications/stats?_t=${t}`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/admin/retention?${authQuery}&days=30&_t=${t}`, { cache: "no-store" }),
      ]);
      if (!statsRes.ok) throw new Error(`${statsRes.status}`);
      const data: AdminStats = await statsRes.json();
      setStats(data);
      setFeedback(data.feedback);
      if (aiRes.ok) setTwinAiAnalytics(await aiRes.json());
      if (updatesRes.ok) setAppUpdatesList(await updatesRes.json());
      if (notifRes.ok) setNotificationStats(await notifRes.json());
      if (retentionRes.ok) setRetentionData(await retentionRes.json());
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAdmin, authQuery, baseUrl]);

  useEffect(() => { if (isAdmin) fetchStats(); }, [fetchStats]);

  const fetchLiveUsers = useCallback(async () => {
    if (!isAdmin) return;
    const t = Date.now();
    try {
      const res = await fetch(`${baseUrl}/api/admin/live-users?${authQuery}&_t=${t}`, { cache: "no-store" });
      if (res.ok) setLiveUsers(await res.json());
    } catch { /* silent */ }
  }, [isAdmin, authQuery, baseUrl]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLiveUsers();
    const timer = setInterval(fetchLiveUsers, 30_000);
    return () => clearInterval(timer);
  }, [fetchLiveUsers, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => { void fetchStats(); }, 120_000);
    return () => clearInterval(timer);
  }, [fetchStats, isAdmin]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput.trim() === envPassword) {
      setAdminPassword(passwordInput.trim());
      sessionStorage.setItem("tt_admin_pw", passwordInput.trim());
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2500);
    }
  }

  async function postUpdate() {
    if (!updateTitle.trim() || !updateDesc.trim()) return;
    setIsPostingUpdate(true);
    try {
      const r = await fetch(`${baseUrl}/api/admin/app-updates?${authQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: updateTitle.trim(), description: updateDesc.trim(), emoji: updateEmoji.trim() || "🍒" }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const created: AppUpdateItem = await r.json();
      setAppUpdatesList((prev) => [created, ...prev]);
      setUpdateSuccess(true);
      setUpdateTitle("");
      setUpdateDesc("");
      setUpdateEmoji("🍒");
      setShowUpdateForm(false);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (e) { console.error(e); }
    finally { setIsPostingUpdate(false); }
  }

  async function deleteUpdate(id: number) {
    const r = await fetch(`${baseUrl}/api/admin/app-updates/${id}?${authQuery}`, { method: "DELETE" });
    if (r.ok) setAppUpdatesList((prev) => prev.filter((u) => u.id !== id));
  }

  async function createPoll() {
    const validOptions = pollOptions.filter((o) => o.label.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    setIsCreatingPoll(true);
    try {
      const r = await fetch(`${baseUrl}/api/admin/polls?${authQuery}`, {
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
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingPoll(false);
    }
  }

  async function toggleStar(id: number) {
    const r = await fetch(`${baseUrl}/api/feedback/${id}/star?${authQuery}`, { method: "PATCH" });
    if (r.ok) {
      const updated: FeedbackEntry = await r.json();
      setFeedback((prev) => prev.map((f) => f.id === id ? updated : f));
    }
  }

  async function toggleResolve(id: number) {
    const r = await fetch(`${baseUrl}/api/feedback/${id}/resolve?${authQuery}`, { method: "PATCH" });
    if (r.ok) {
      const updated: FeedbackEntry = await r.json();
      setFeedback((prev) => prev.map((f) => f.id === id ? updated : f));
    }
  }

  if (!userId) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 to-accent/5 flex flex-col items-center justify-center p-6 max-w-[430px] mx-auto">
        <div className="w-full bg-white rounded-3xl border border-border shadow-sm p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Lock size={24} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter the admin password to continue</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all ${
                passwordError ? "border-red-400 bg-red-50" : "border-border bg-muted/30 focus:border-primary"
              }`}
              data-testid="admin-password-input"
            />
            {passwordError && (
              <p className="text-xs text-red-600 font-medium text-center">Incorrect password — try again</p>
            )}
            <button
              type="submit"
              disabled={!passwordInput.trim()}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
              data-testid="admin-password-submit"
            >
              Sign In
            </button>
          </form>

          <button onClick={() => setLocation("/dashboard")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to app
          </button>
        </div>
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

  const emails = stats?.emails ?? [];
  const shownEmails = showAllEmails ? emails : emails.slice(0, 5);
  const polls = stats?.polls ?? [];

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
          <div className="flex items-center gap-2">
            {isAdminByPassword && (
              <button
                onClick={() => { sessionStorage.removeItem("tt_admin_pw"); setAdminPassword(""); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg transition-colors"
              >
                Sign out
              </button>
            )}
            <button onClick={fetchStats} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold disabled:opacity-50 transition-all">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />Refresh
            </button>
            <button
              onClick={async () => {
                if ("serviceWorker" in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                }
                if ("caches" in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
                window.location.reload();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-semibold hover:bg-orange-100 transition-all"
              title="Clear all browser caches and force reload"
            >
              <Zap size={13} />Force Reload
            </button>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center pt-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : stats ? (
        <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">

          {/* ── LIVE USERS ── */}
          <section>
            <SectionHeader icon={<Activity size={16} />} title="Live Users" />
            <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-600 font-semibold">Online now</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{liveUsers?.online.length ?? "—"}</p>
                  <p className="text-xs text-green-500">last 5 min</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                  <p className="text-xs text-blue-600 font-semibold mb-0.5">Active</p>
                  <p className="text-2xl font-bold text-blue-700">{liveUsers ? liveUsers.online.length + liveUsers.recent.length : "—"}</p>
                  <p className="text-xs text-blue-500">last 30 min</p>
                </div>
                <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground font-semibold mb-0.5">Past hour</p>
                  <p className="text-2xl font-bold text-foreground">{liveUsers?.total ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">unique users</p>
                </div>
              </div>
              {liveUsers && liveUsers.total > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...liveUsers.online, ...liveUsers.recent, ...liveUsers.lastHour].map((u) => (
                    <div key={u.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${u.minutesAgo <= 5 ? "bg-green-500" : u.minutesAgo <= 30 ? "bg-blue-400" : "bg-gray-300"}`} />
                      <span className="text-muted-foreground font-mono truncate flex-1">{u.userId.slice(0, 20)}…</span>
                      <span className="text-muted-foreground/70 flex-shrink-0">{u.currentPage}</span>
                      <span className="text-muted-foreground/50 flex-shrink-0 w-12 text-right">{u.minutesAgo === 0 ? "now" : `${u.minutesAgo}m`}</span>
                    </div>
                  ))}
                </div>
              )}
              {liveUsers && liveUsers.total === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No users active in the past hour</p>
              )}
              <p className="text-[10px] text-muted-foreground/50 text-right">Auto-refreshes every 30s</p>
            </div>
          </section>

          {/* ── USERS ── */}
          <section>
            <SectionHeader icon={<Users size={16} />} title="Users" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Users with twins" value={stats.users.uniqueUsersWithTwins} sub="unique accounts" />
              <StatCard label="Onboarding done" value={stats.users.onboardingCompleted} sub={`of ${stats.users.onboardingTotal} started`} />
              <StatCard label="Completion rate" value={stats.users.onboardingTotal ? `${Math.round((stats.users.onboardingCompleted / stats.users.onboardingTotal) * 100)}%` : "—"} sub="onboarding" />
              <StatCard label="Ambassadors 💕" value={stats.users.ambassadors} sub="want to help" accent />
              <StatCard label="Emails captured" value={stats.users.emailsCaptured} sub="have email" />
              <StatCard label="Newsletter 📧" value={stats.users.newsletterSubscribers} sub="subscribed" accent />
            </div>
          </section>

          {/* ── RETENTION & DAU ── */}
          {retentionData && (
            <section>
              <SectionHeader icon={<TrendingUp size={16} />} title="Retention & Growth (30 days)" />

              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard label="Push opt-in rate" value={`${retentionData.totals.pushOptInRate}%`} sub="of onboarded users" accent />
                <StatCard label="Push subscribers" value={retentionData.totals.pushSubscribers} sub="active devices" />
                <StatCard label="Onboarded" value={retentionData.totals.onboardedUsers} sub="completed setup" />
              </div>

              {retentionData.dau.length > 0 ? (
                <div className="bg-white rounded-2xl p-4 border border-border mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Daily Active Users (30d)</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={retentionData.dau} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#da5a9f" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#da5a9f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b9ea5" }} tickFormatter={(v: string) => new Date(v + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: "#6b9ea5" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e8d5e4", fontSize: 11 }}
                        labelFormatter={(v: string) => new Date(v + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        formatter={(v: number) => [v, "Active users"]}
                      />
                      <Area type="monotone" dataKey="users" stroke="#da5a9f" strokeWidth={2} fill="url(#dauGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-border mb-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Daily Active Users (30d)</p>
                  <p className="text-xs text-muted-foreground italic">No activity data yet — data appears once users start logging 🍒</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {retentionData.signupsByDay.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">New Signups per Day</p>
                    <ResponsiveContainer width="100%" height={90}>
                      <ReBarChart data={retentionData.signupsByDay} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b9ea5" }} tickFormatter={(v: string) => new Date(v + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "#6b9ea5" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8d5e4", fontSize: 11 }} formatter={(v: number) => [v, "Signups"]} />
                        <Bar dataKey="signups" fill="#da5a9f" radius={[3, 3, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {retentionData.notifByDay.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Notification Open Rate (%)</p>
                    <ResponsiveContainer width="100%" height={90}>
                      <AreaChart data={retentionData.notifByDay} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="notifGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b9ea5" }} tickFormatter={(v: string) => new Date(v + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "#6b9ea5" }} domain={[0, 100]} unit="%" />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8d5e4", fontSize: 11 }} formatter={(v: number) => [`${v}%`, "Open rate"]} />
                        <Area type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2} fill="url(#notifGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {retentionData.pushSubsByDay.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">New Push Subscribers per Day</p>
                    <ResponsiveContainer width="100%" height={90}>
                      <ReBarChart data={retentionData.pushSubsByDay} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b9ea5" }} tickFormatter={(v: string) => new Date(v + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "#6b9ea5" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8d5e4", fontSize: 11 }} formatter={(v: number) => [v, "New subscribers"]} />
                        <Bar dataKey="subs" fill="#2e818c" radius={[3, 3, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>
          )}

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

          {/* ── NOTIFICATIONS ── */}
          {notificationStats && (
            <section>
              <SectionHeader icon={<Bell size={16} />} title="Push Notifications" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                <StatCard label="Push subscribers" value={notificationStats.totalSubscribers} sub="active devices" accent />
                <StatCard label="Subscribed users" value={notificationStats.uniqueSubscribedUsers} sub="unique accounts" />
                <StatCard label="Notifications sent" value={notificationStats.totalSent} sub="all time" />
                <StatCard label="Open rate" value={`${notificationStats.openRate}%`} sub={`${notificationStats.totalOpened} opened`} accent />
              </div>
              {Object.keys(notificationStats.byType).length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">By Type</p>
                  <div className="space-y-2.5">
                    {Object.entries(notificationStats.byType).map(([type, d]) => {
                      const pct = d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0;
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground font-medium capitalize">{type}</span>
                            <span className="text-muted-foreground">{d.sent} sent · {pct}% opened</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── TWIN AI ANALYTICS ── */}
          {twinAiAnalytics && (
            <section>
              <SectionHeader icon={<Sparkles size={16} />} title="✨ Twin AI Usage" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                <StatCard label="Total questions" value={twinAiAnalytics.totalMessages} sub="all time" accent />
                <StatCard label="Today" value={twinAiAnalytics.todayMessages} sub="questions asked" />
                <StatCard label="Avg per user" value={twinAiAnalytics.avgPerUser} sub="questions" />
                <StatCard label="Unique users" value={twinAiAnalytics.uniqueUsers} sub="asked AI" />
              </div>

              <div className="bg-white rounded-2xl p-4 border border-border mb-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Response Feedback</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👍</span>
                    <div>
                      <p className="text-lg font-bold text-foreground">{twinAiAnalytics.helpfulCount}</p>
                      <p className="text-xs text-muted-foreground">Helpful</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👎</span>
                    <div>
                      <p className="text-lg font-bold text-foreground">{twinAiAnalytics.notHelpfulCount}</p>
                      <p className="text-xs text-muted-foreground">Not helpful</p>
                    </div>
                  </div>
                  {twinAiAnalytics.helpfulCount + twinAiAnalytics.notHelpfulCount > 0 && (
                    <div className="ml-auto">
                      <p className="text-base font-bold text-green-600">
                        {Math.round((twinAiAnalytics.helpfulCount / (twinAiAnalytics.helpfulCount + twinAiAnalytics.notHelpfulCount)) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">satisfaction</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-2xl p-4 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Questions by Topic</p>
                  {twinAiAnalytics.categoryBreakdown.length === 0
                    ? <p className="text-xs text-muted-foreground italic">No data yet 🍒</p>
                    : <BreakdownBars items={twinAiAnalytics.categoryBreakdown} color="bg-violet-400" />
                  }
                </div>

                <div className="bg-white rounded-2xl p-4 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Daily Usage (7 days)</p>
                  {twinAiAnalytics.dailyUsage.length === 0
                    ? <p className="text-xs text-muted-foreground italic">No data yet 🍒</p>
                    : (
                      <div className="space-y-2">
                        {twinAiAnalytics.dailyUsage.map((d) => {
                          const max = Math.max(...twinAiAnalytics.dailyUsage.map((x) => x.count), 1);
                          return (
                            <div key={d.date}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-foreground font-medium">
                                  {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </span>
                                <span className="text-muted-foreground">{d.count}</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-violet-400 rounded-full transition-all" style={{ width: `${Math.round((d.count / max) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Top Questions 💡</p>
                {twinAiAnalytics.topQuestions.length === 0
                  ? <p className="text-xs text-muted-foreground italic">No questions asked yet — come back soon!</p>
                  : (
                    <div className="space-y-0">
                      {twinAiAnalytics.topQuestions.map((q, i) => (
                        <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
                          <span className="text-xs font-bold text-primary/50 w-5 flex-shrink-0 pt-0.5">{i + 1}</span>
                          <p className="text-sm text-foreground leading-snug flex-1">{q.question}</p>
                          <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 bg-muted px-1.5 py-0.5 rounded-full">{q.count}×</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </section>
          )}

          {/* ── GOOGLE SHEETS SYNC ── */}
          <section>
            <SectionHeader icon={<Sheet size={16} />} title="Google Sheets Sync" />
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-500 font-bold">●</span>
                <p className="text-sm text-foreground font-medium">Auto-sync active</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                New onboarding completions sync automatically to Google Sheets. No manual action needed.
              </p>
              <p className="text-xs text-muted-foreground">
                ⚡ Requires <code className="bg-muted px-1 rounded">GOOGLE_SHEET_ID</code> env var. Watch API server logs for output.
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

            {/* Poll results */}
            {polls.length > 0 ? (
              <div className="space-y-3">
                {(showAllPolls ? polls : polls.slice(0, 1)).map((poll) => {
                  let options: { key: string; label: string }[] = [];
                  try { options = JSON.parse(poll.options); } catch { /* */ }
                  return (
                    <div key={poll.id} className="bg-white rounded-2xl border border-border overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{poll.category}</span>
                          {poll.isActive && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Live</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BarChart size={11} />
                          <span className="font-semibold">{poll.totalResponses} votes</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm font-semibold text-foreground leading-snug">{poll.question}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {options.map((o) => (
                            <span key={o.key} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{o.label}</span>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1">
                          Created {new Date(poll.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {polls.length > 1 && (
                  <button
                    onClick={() => setShowAllPolls((v) => !v)}
                    className="w-full py-2.5 text-xs font-semibold text-primary bg-white border border-border rounded-2xl hover:bg-muted/30 transition-colors"
                  >
                    {showAllPolls ? "Show less" : `Show All Polls (${polls.length})`}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border p-5">
                <p className="text-sm text-muted-foreground">
                  No polls yet. Create your first one above — it will appear on the Community tab for all users.
                </p>
              </div>
            )}
          </section>

          {/* ── UPDATE CENTER ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-base leading-none">🍒</span>
                </div>
                <h2 className="font-bold text-foreground text-base">Update Center</h2>
              </div>
              <button
                onClick={() => { setShowUpdateForm((v) => !v); setUpdateSuccess(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold"
              >
                <Plus size={13} />{showUpdateForm ? "Cancel" : "Post Update"}
              </button>
            </div>

            {updateSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium mb-4">
                ✓ Update posted and visible to all users!
              </div>
            )}

            {showUpdateForm && (
              <div className="bg-white rounded-2xl border border-border p-5 space-y-4 mb-4">
                <p className="text-sm font-semibold text-foreground">Post a New Update</p>
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Emoji</label>
                    <input
                      value={updateEmoji}
                      onChange={(e) => setUpdateEmoji(e.target.value)}
                      placeholder="🍒"
                      maxLength={4}
                      className="mt-1.5 w-14 px-2 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-center outline-none focus:ring-2 ring-primary/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</label>
                    <input
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder="e.g. New feature launched!"
                      maxLength={120}
                      className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
                  <textarea
                    value={updateDesc}
                    onChange={(e) => setUpdateDesc(e.target.value)}
                    placeholder="What did we ship? Keep it warm and exciting for twin moms 💕"
                    rows={3}
                    maxLength={500}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
                  />
                  <p className="text-right text-[10px] text-muted-foreground mt-0.5">{updateDesc.length}/500</p>
                </div>
                <button
                  onClick={postUpdate}
                  disabled={isPostingUpdate || !updateTitle.trim() || !updateDesc.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isPostingUpdate ? "Posting…" : "Publish Update 🍒"}
                </button>
              </div>
            )}

            {appUpdatesList.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 border border-border text-center text-sm text-muted-foreground">
                No updates posted yet — click "Post Update" to add the first one!
              </div>
            ) : (
              <div className="space-y-2">
                {appUpdatesList.slice(0, 15).map((u) => (
                  <div key={u.id} className="bg-white rounded-2xl border border-border px-4 py-3 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{u.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{u.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{u.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(u.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteUpdate(u.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Delete update"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                {(showAllFeedback ? filteredFeedback : filteredFeedback.slice(0, 5)).map((f) => (
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
                {filteredFeedback.length > 5 && (
                  <button
                    onClick={() => setShowAllFeedback((v) => !v)}
                    className="w-full py-2.5 text-xs font-semibold text-primary bg-white border border-border rounded-2xl hover:bg-muted/30 transition-colors"
                  >
                    {showAllFeedback ? "Show less" : `Show All Feedback (${filteredFeedback.length})`}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── EMAIL LIST ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Mail size={16} />
                </div>
                <h2 className="font-bold text-foreground text-base">Email List</h2>
              </div>
              {emails.length > 0 && (
                <button
                  onClick={() => exportEmailsCSV(emails)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 border border-green-200 text-xs font-semibold hover:bg-green-100 transition-colors"
                >
                  <Download size={12} /> Export CSV
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {emails.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No emails captured yet 🍒</div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/20">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {emails.length} emails · {emails.filter((e) => e.newsletterConsent).length} newsletter
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {shownEmails.map((entry) => (
                      <div key={entry.userId} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">{entry.email}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            {entry.instagramHandle && (
                              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Instagram size={9} />@{entry.instagramHandle.replace(/^@/, "")}
                              </span>
                            )}
                            {entry.babyAgeGroup && (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                                {LABELS.age[entry.babyAgeGroup] ?? entry.babyAgeGroup}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {entry.newsletterConsent && (
                            <span className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                              Newsletter ✓
                            </span>
                          )}
                          <CopyBtn text={entry.email} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {emails.length > 5 && (
                    <button
                      onClick={() => setShowAllEmails((v) => !v)}
                      className="w-full py-3 text-xs font-semibold text-primary bg-muted/20 hover:bg-muted/40 transition-colors border-t border-border"
                    >
                      {showAllEmails ? "Show less" : `Show Full Email List (${emails.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

        </div>
      ) : null}
    </div>
  );
}
