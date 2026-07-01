import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useListTwins,
  useCreateTwin,
  useUpdateTwin,
  getListTwinsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Save, LogOut, Video, ChevronRight, Trash2, AlertTriangle, Bell, BellOff, Smartphone, Sparkles, UserPlus, Users, X, Copy, Check, Lock, Plus } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { usePlan, trackPlanEvent } from "@/hooks/usePlan";
import UpgradeScreen from "@/components/UpgradeScreen";

const COLOR_OPTIONS = [
  "#da5a9f",
  "#2e818c",
  "#83b8c0",
  "#9b59b6",
  "#e67e22",
  "#27ae60",
  "#e74c3c",
  "#3498db",
];

const GENDER_OPTIONS = ["Girl", "Boy", "Prefer not to say"];

type TwinFormData = {
  name: string;
  gender: string;
  birthdate: string;
  colorTheme: string;
};

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { permission, subscription, loading: pushLoading, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const { prefs, toggle } = useNotificationPrefs();
  const { prefs: appPrefs, toggle: toggleApp } = useAppPrefs();
  const { isPremium } = usePlan();
  const [showCaregiverUpgrade, setShowCaregiverUpgrade] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const { data: twins = [], isLoading } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const createTwin = useCreateTwin();
  const updateTwin = useUpdateTwin();

  const defaultForm: TwinFormData = { name: "", gender: "", birthdate: "", colorTheme: "#da5a9f" };
  const [formA, setFormA] = useState<TwinFormData>(defaultForm);
  const [formB, setFormB] = useState<TwinFormData>({ ...defaultForm, colorTheme: "#2e818c" });
  const [savedA, setSavedA] = useState(false);
  const [savedB, setSavedB] = useState(false);
  const [extraForms, setExtraForms] = useState<Record<number, TwinFormData>>({});
  const [extraSaved, setExtraSaved] = useState<Record<number, boolean>>({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Caregiver invite state
  type CaregiverRow = { id: number; caregiverEmail: string; role: string; displayName?: string | null; status: string; inviteToken: string; emailSent?: boolean };
  const [caregivers, setCaregivers] = useState<CaregiverRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Dad" | "Partner" | "Grandparent" | "Nanny" | "Other">("Dad");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ emailSent: boolean; token: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/caregivers?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCaregivers(data); })
      .catch(() => {});
  }, [user?.id]);

  async function sendInvite() {
    if (!user?.id || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteResult(null);
    try {
      const parentName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.emailAddresses?.[0]?.emailAddress ||
        "A TwinTrack parent";
      const twinNames = twins
        .map((t) => t.name || t.label)
        .filter(Boolean) as string[];

      const res = await fetch("/api/caregivers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: user.id,
          caregiverEmail: inviteEmail.trim(),
          role: inviteRole,
          parentName,
          twinNames,
          appBaseUrl: window.location.origin,
        }),
      });
      const row = await res.json() as CaregiverRow & { emailSent?: boolean };
      setCaregivers((prev) => [...prev, row]);
      setInviteEmail("");
      setInviteResult({ emailSent: row.emailSent ?? false, token: row.inviteToken });
      setTimeout(() => setInviteResult(null), 6000);
    } finally {
      setInviteLoading(false);
    }
  }

  async function revokeCaregiver(id: number) {
    await fetch(`/api/caregivers/${id}`, { method: "DELETE" });
    setCaregivers((prev) => prev.map((c) => c.id === id ? { ...c, status: "revoked" } : c));
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const twinA = twins.find((t) => t.label === "Twin A");
  const twinB = twins.find((t) => t.label === "Twin B");
  const extraTwins = twins.filter((t) => t.label !== "Twin A" && t.label !== "Twin B");

  useEffect(() => {
    if (twinA) {
      setFormA({
        name: twinA.name,
        gender: twinA.gender ?? "",
        birthdate: twinA.birthdate ?? "",
        colorTheme: twinA.colorTheme,
      });
    }
    if (twinB) {
      setFormB({
        name: twinB.name,
        gender: twinB.gender ?? "",
        birthdate: twinB.birthdate ?? "",
        colorTheme: twinB.colorTheme,
      });
    }
    for (const t of extraTwins) {
      setExtraForms((prev) => ({
        ...prev,
        [t.id]: prev[t.id] ?? { name: t.name, gender: t.gender ?? "", birthdate: t.birthdate ?? "", colorTheme: t.colorTheme },
      }));
    }
  }, [twins.length]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) });
  }

  function addChild() {
    if (!user?.id || twins.length >= 6) return;
    const CHILD_COLORS = ["#9b59b6", "#e67e22", "#27ae60", "#e74c3c"];
    const nextLabel = `Child ${twins.length + 1}`;
    const color = CHILD_COLORS[(twins.length - 2) % CHILD_COLORS.length];
    createTwin.mutate(
      { data: { userId: user.id, label: nextLabel, name: nextLabel, colorTheme: color } },
      { onSuccess: () => invalidate() },
    );
  }

  function saveExtraTwin(twin: { id: number; label: string }) {
    if (!user?.id) return;
    const form = extraForms[twin.id];
    if (!form) return;
    updateTwin.mutate(
      { id: twin.id, data: { name: form.name || null, gender: form.gender || null, birthdate: form.birthdate || null, colorTheme: form.colorTheme } },
      {
        onSuccess: () => {
          invalidate();
          setExtraSaved((prev) => ({ ...prev, [twin.id]: true }));
          setTimeout(() => setExtraSaved((prev) => ({ ...prev, [twin.id]: false })), 2000);
        },
      },
    );
  }

  function saveTwin(label: "Twin A" | "Twin B", form: TwinFormData, existing?: typeof twinA) {
    if (!user?.id) return;
    const setSaved = label === "Twin A" ? setSavedA : setSavedB;

    if (existing) {
      updateTwin.mutate(
        {
          id: existing.id,
          data: {
            name: form.name || null,
            gender: form.gender || null,
            birthdate: form.birthdate || null,
            colorTheme: form.colorTheme,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
        },
      );
    } else {
      createTwin.mutate(
        {
          data: {
            userId: user.id,
            label,
            name: form.name || label,
            gender: form.gender || null,
            birthdate: form.birthdate || null,
            colorTheme: form.colorTheme,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          },
        },
      );
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toLowerCase() !== "delete") return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setDeleteError(body.error ?? "Something went wrong. Please try again.");
        setIsDeleting(false);
        return;
      }
      await signOut();
      setLocation("/");
    } catch {
      setDeleteError("Could not connect to the server. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <Layout>
      <PageHeader title="Settings" subtitle="Manage your twin profiles" />

      <div className="px-4 space-y-6 pb-4">
        {/* App Experience */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">App Experience</p>
          </div>
          <div className="divide-y divide-border/50">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug">Show Twin AI</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {appPrefs.showTwinAI
                      ? "Personalised AI tips visible in the navigation"
                      : "Twin AI tab hidden — you can turn it back on any time"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleApp("showTwinAI")}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                  appPrefs.showTwinAI ? "bg-violet-400" : "bg-muted"
                }`}
                role="switch"
                aria-checked={appPrefs.showTwinAI}
                data-testid="toggle-twin-ai"
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                    appPrefs.showTwinAI ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{user?.fullName || user?.emailAddresses[0]?.emailAddress}</p>
              <p className="text-xs text-muted-foreground">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors font-medium"
              data-testid="button-sign-out"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Caregiver Access */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Family Caregivers</p>
            {!isPremium && (
              <span className="ml-auto text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                Premium
              </span>
            )}
          </div>

          {!isPremium ? (
            <div className="px-5 py-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
                <Lock size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Caregiver Access is Premium</p>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Invite Dad, Grandma, or your nanny to log feedings, sleep, and diapers — everyone stays in sync.
                </p>
              </div>
              <button
                onClick={() => {
                  trackPlanEvent("caregiver_upgrade_prompt_shown");
                  setShowCaregiverUpgrade(true);
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%)" }}
              >
                💕 Unlock Caregiver Access
              </button>
              <p className="text-xs text-muted-foreground">Free for 14 days, then $5.99/month or $39/year</p>
            </div>
          ) : (
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Invite your partner, grandparent, or nanny to log feedings, sleep, diapers, and milestones — all synced to your family account.
            </p>

            {/* Invite form */}
            <div className="space-y-2.5">
              <div className="flex gap-2 flex-wrap">
                {(["Dad", "Partner", "Grandparent", "Nanny", "Other"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      inviteRole === r ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                  placeholder="caregiver@email.com"
                  type="email"
                  className="flex-1 px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
                  data-testid="input-caregiver-email"
                />
                <button
                  onClick={sendInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  data-testid="button-invite-caregiver"
                >
                  <UserPlus size={15} />
                  {inviteLoading ? "..." : "Invite"}
                </button>
              </div>
            </div>

            {/* Caregiver list */}
            {caregivers.filter((c) => c.status !== "revoked").length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Your Caregivers</p>
                {caregivers.filter((c) => c.status !== "revoked").map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3.5 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                      {c.role === "Dad" ? "👨" : c.role === "Partner" ? "💑" : c.role === "Grandparent" ? "👴" : c.role === "Nanny" ? "👩‍🍼" : "👤"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.caregiverEmail}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{c.role}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className={`text-[10px] font-semibold ${c.status === "active" ? "text-green-600" : "text-amber-500"}`}>
                          {c.status === "active" ? "Active" : "Pending invite"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {c.status === "pending" && (
                        <button
                          onClick={() => copyInviteLink(c.inviteToken)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                          title="Copy invite link"
                        >
                          {copiedToken === c.inviteToken ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-muted-foreground" />}
                        </button>
                      )}
                      <button
                        onClick={() => revokeCaregiver(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove caregiver"
                      >
                        <X size={13} className="text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Email send result feedback */}
            {inviteResult && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
                inviteResult.emailSent
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}>
                <span className="flex-shrink-0 mt-0.5">{inviteResult.emailSent ? "✅" : "⚠️"}</span>
                <div>
                  {inviteResult.emailSent ? (
                    <p className="font-semibold">Invitation email sent!</p>
                  ) : (
                    <p className="font-semibold">Email couldn't be delivered</p>
                  )}
                  <p className="text-xs mt-0.5 opacity-80">
                    {inviteResult.emailSent
                      ? "Your caregiver will receive a branded invite with the acceptance link."
                      : "No worries — tap the copy icon below to share the invite link manually."}
                  </p>
                </div>
              </div>
            )}

            {caregivers.filter((c) => c.status === "pending").length > 0 && !inviteResult?.emailSent && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 Tap the copy icon to share the invite link with your caregiver. They'll use it to link their TwinTrack account to your family.
              </p>
            )}
          </div>
          )}
        </div>

        <UpgradeScreen
          open={showCaregiverUpgrade}
          onClose={() => setShowCaregiverUpgrade(false)}
          feature="caregivers"
          source="settings_caregivers"
        />

        {/* Content Management */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Library</p>
          </div>
          <button
            onClick={() => setLocation("/admin/videos")}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
            data-testid="button-video-admin"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Video size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Add Videos to Learn</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import YouTube or other videos to the library</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notifications</p>
          </div>

          {/* Push enable/disable */}
          <div className="px-5 py-4 border-b border-border/50">
            {permission === "unsupported" ? (
              <div className="flex items-center gap-3">
                <Smartphone size={16} className="text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">Push notifications require installing TwinTrack to your home screen.</p>
              </div>
            ) : !subscription ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <BellOff size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Push reminders off</p>
                    <p className="text-xs text-muted-foreground">Get alerts for feeds, sleep &amp; more</p>
                  </div>
                </div>
                <button
                  onClick={subscribe}
                  disabled={pushLoading || permission === "denied"}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  {permission === "denied" ? "Blocked" : pushLoading ? "…" : "Enable"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Bell size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Push reminders on</p>
                    <p className="text-xs text-muted-foreground">This device will receive alerts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => { await sendTest(); setTestSent(true); setTimeout(() => setTestSent(false), 3000); }}
                    disabled={testSent}
                    className="text-xs font-semibold text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5 active:scale-95 transition-all"
                  >
                    {testSent ? "Sent ✓" : "Test"}
                  </button>
                  <button
                    onClick={unsubscribe}
                    disabled={pushLoading}
                    className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 active:scale-95 transition-all"
                  >
                    {pushLoading ? "…" : "Disable"}
                  </button>
                </div>
              </div>
            )}
            {permission === "denied" && (
              <p className="text-xs text-amber-600 mt-2">Notifications are blocked. Enable them in your browser / device settings.</p>
            )}
          </div>

          {/* Reminder toggles */}
          <div className="divide-y divide-border/50">
            {([
              { key: "feedingReminders", label: "Feeding reminders", desc: "Smart alerts based on last feed time", emoji: "🍼" },
              { key: "sleepReminders", label: "Sleep reminders", desc: "Nap window suggestions by age", emoji: "😴" },
              { key: "pumpingReminders", label: "Pumping reminders", desc: "Regular pump schedule alerts", emoji: "🫙" },
              { key: "medicationReminders", label: "Medication reminders", desc: "Vitamin and medication alerts", emoji: "💊" },
              { key: "milestoneReminders", label: "Milestone tips", desc: "Age-appropriate development updates", emoji: "⭐" },
              { key: "twinAiTips", label: "Twin AI insights", desc: "Personalised tips from Twin AI", emoji: "✨" },
              { key: "weeklyInsights", label: "Weekly report", desc: "Summary of the past week's tracking", emoji: "📊" },
              { key: "dailyLogReminder", label: "Daily log reminder", desc: "Evening nudge if nothing logged today", emoji: "📝" },
            ] as const).map(({ key, label, desc, emoji }) => (
              <div key={key} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg leading-none flex-shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(key)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${prefs[key] ? "bg-primary" : "bg-muted"}`}
                  role="switch"
                  aria-checked={prefs[key]}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Twin A */}
        <TwinProfileForm
          label="Twin A"
          form={formA}
          onChange={setFormA}
          onSave={() => saveTwin("Twin A", formA, twinA)}
          saved={savedA}
          isPending={createTwin.isPending || updateTwin.isPending}
        />

        {/* Twin B */}
        <TwinProfileForm
          label="Twin B"
          form={formB}
          onChange={setFormB}
          onSave={() => saveTwin("Twin B", formB, twinB)}
          saved={savedB}
          isPending={createTwin.isPending || updateTwin.isPending}
        />

        {/* Extra children (triplets, quads, etc.) */}
        {extraTwins.map((t) => (
          <TwinProfileForm
            key={t.id}
            label={t.label}
            form={extraForms[t.id] ?? { name: t.name, gender: t.gender ?? "", birthdate: t.birthdate ?? "", colorTheme: t.colorTheme }}
            onChange={(f) => setExtraForms((prev) => ({ ...prev, [t.id]: f }))}
            onSave={() => saveExtraTwin(t)}
            saved={extraSaved[t.id] ?? false}
            isPending={updateTwin.isPending}
          />
        ))}

        {/* Add another child (triplets / quads support, max 6) */}
        {twins.length < 6 && (
          <button
            onClick={addChild}
            disabled={createTwin.isPending}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 bg-white"
          >
            <Plus size={16} />
            Add another child
          </button>
        )}

        {/* Delete Account */}
        <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Danger Zone</p>
          </div>

          {!showDeleteConfirm ? (
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently removes all your data</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
                data-testid="button-delete-account"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-start gap-3 bg-red-50 rounded-xl p-4 border border-red-100">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-700">This cannot be undone</p>
                  <p className="text-xs text-red-500 mt-1 leading-relaxed">
                    All your twins' data — sleep logs, feeding records, diapers, routines, and milestones — will be permanently deleted.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Type <span className="text-red-500 font-bold">delete</span> to confirm
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete"
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-red-300 transition-all"
                  data-testid="input-delete-confirm"
                />
              </div>

              {deleteError && (
                <p className="text-xs text-red-500 font-medium">{deleteError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(null); }}
                  className="py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || isDeleting}
                  className="py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                  data-testid="button-confirm-delete"
                >
                  {isDeleting ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TwinProfileForm({
  label,
  form,
  onChange,
  onSave,
  saved,
  isPending,
}: {
  label: string;
  form: TwinFormData;
  onChange: (f: TwinFormData) => void;
  onSave: () => void;
  saved: boolean;
  isPending: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div
        className="px-5 py-4 border-b border-border flex items-center gap-3"
        style={{ backgroundColor: form.colorTheme + "15" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: form.colorTheme }}
        >
          {(form.name || label).charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{form.name || "Unnamed"}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder={`${label} name...`}
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
            data-testid={`input-${label.replace(" ", "-").toLowerCase()}-name`}
          />
        </Field>

        <Field label="Gender">
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => onChange({ ...form, gender: g })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  form.gender === g ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
                data-testid={`gender-${g.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Birthdate">
          <input
            type="date"
            value={form.birthdate}
            onChange={(e) => onChange({ ...form, birthdate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
            data-testid={`input-${label.replace(" ", "-").toLowerCase()}-birthdate`}
          />
        </Field>

        <Field label="Color Theme">
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...form, colorTheme: c })}
                className={`w-9 h-9 rounded-full transition-all active:scale-90 ${
                  form.colorTheme === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                }`}
                style={{ backgroundColor: c }}
                data-testid={`color-${c}`}
              />
            ))}
          </div>
        </Field>

        <button
          onClick={onSave}
          disabled={isPending}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
            saved ? "bg-green-500 text-white" : "bg-primary text-white"
          } disabled:opacity-50`}
          data-testid={`button-save-${label.replace(" ", "-").toLowerCase()}`}
        >
          <Save size={16} />
          {saved ? "Saved!" : isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
