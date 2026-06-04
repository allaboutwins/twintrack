import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import logoAat from "../assets/logo-aat.png";
import { Home, Moon, Utensils, GraduationCap, Settings, MessageCircle, X, Sparkles, BarChart2, Heart } from "lucide-react";
import { useUser } from "@clerk/react";
import { useSubmitFeedback } from "@workspace/api-client-react";
import NotificationCenter from "@/components/NotificationCenter";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineBanner from "@/components/OfflineBanner";
import FoundingMomsButton from "@/components/FoundingMomsButton";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { posthog } from "@/lib/posthog";

const FEEDBACK_TYPES = [
  { key: "bug", label: "🐛 Bug report" },
  { key: "feature", label: "💡 Feature idea" },
  { key: "feedback", label: "💬 General feedback" },
  { key: "confusion", label: "😕 Something confusing" },
  { key: "love", label: "💕 Something I love" },
];

function FeedbackButton() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submitFeedback = useSubmitFeedback();

  function close() {
    setOpen(false);
    setType("");
    setMessage("");
    setSubmitted(false);
  }

  function submit() {
    if (!type || !message.trim()) return;
    submitFeedback.mutate(
      { data: { userId: user?.id ?? null, feedbackType: type, message: message.trim(), metadata: null } },
      {
        onSuccess: () => {
          setSubmitted(true);
          setTimeout(close, 2200);
        },
      },
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-3 z-40 flex items-center gap-1.5 bg-white border border-border/70 shadow-md rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 58px)" }}
        data-testid="feedback-button"
        aria-label="Send feedback"
      >
        <MessageCircle size={13} />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-5 space-y-4 max-h-[88dvh] overflow-y-auto safe-area-pb">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Help us improve 💕</h3>
                <p className="text-xs text-muted-foreground">Your feedback shapes TwinTrack</p>
              </div>
              <button onClick={close} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {submitted ? (
              <div className="py-10 text-center">
                <p className="text-5xl mb-3">💕🍒</p>
                <p className="font-bold text-foreground text-lg">Thank you!</p>
                <p className="text-sm text-muted-foreground mt-1">Your feedback means the world to us.</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    What kind of feedback?
                  </p>
                  <div className="space-y-1.5">
                    {FEEDBACK_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setType(t.key)}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-all border ${
                          type === t.key
                            ? "border-primary bg-primary/8 text-primary"
                            : "border-border bg-muted/20 text-foreground"
                        }`}
                        data-testid={`feedback-type-${t.key}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Your message
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us more…"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
                    data-testid="feedback-message"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={!type || !message.trim() || submitFeedback.isPending}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
                  data-testid="feedback-submit"
                >
                  {submitFeedback.isPending ? "Sending…" : "Send feedback →"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const ALL_TABS = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/sleep", icon: Moon, label: "Sleep" },
  { path: "/feeding", icon: Utensils, label: "Feed" },
  { path: "/milestones", icon: Heart, label: "Memories" },
  { path: "/stats", icon: BarChart2, label: "Stats" },
  { path: "/twin-ai", icon: Sparkles, label: "Twin AI", highlight: true, pref: "showTwinAI" as const },
  { path: "/learn", icon: GraduationCap, label: "Learn" },
];

const TWIN_AI_OPENED_KEY = "tt_twin_ai_opened";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [twinAiOpened, setTwinAiOpened] = useState(() => {
    try { return !!localStorage.getItem(TWIN_AI_OPENED_KEY); } catch { return false; }
  });
  const { user } = useUser();
  const { prefs } = useAppPrefs();
  const baseUrl = useRef((import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")).current;

  const tabs = ALL_TABS.filter((t) => !t.pref || prefs[t.pref]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`${baseUrl}/api/notifications?limit=50`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ isRead: boolean }>) => {
        setUnreadCount(data.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, [user?.id, baseUrl]);

  function openNotifications() {
    posthog?.capture("notification_center_opened");
    setShowNotifications(true);
  }

  function closeNotifications() {
    setShowNotifications(false);
    setUnreadCount(0);
  }

  return (
    // Outer shell fills exactly the viewport height — no overflow, no fixed tricks.
    // This is far more reliable than `position:fixed` for the nav, especially in
    // Facebook/Instagram WebView and iOS Safari where fixed + transform can fail.
    <div className="flex flex-col h-[100dvh] max-w-[430px] mx-auto bg-background overflow-hidden">
      <OfflineBanner />

      {/* Top header — never scrolls */}
      <div className="flex-shrink-0 bg-white border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-16">
          <img src={logoAat} alt="All About Twins" className="h-16 w-auto" />
          <div className="flex items-center">
            <FoundingMomsButton />
            <button
              onClick={openNotifications}
              className="relative p-2 rounded-full hover:bg-muted/60 transition-colors"
              aria-label="Notifications"
              data-testid="notifications-button"
            >
              <span className="text-base leading-none select-none">🍒</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full bg-primary border-2 border-white text-[8px] font-bold text-white flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <Link
              to="/settings"
              className={`p-2 rounded-full transition-colors ${
                location === "/settings"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
              aria-label="Settings"
            >
              <Settings size={16} strokeWidth={location === "/settings" ? 2.5 : 1.8} />
            </Link>
          </div>
        </div>
      </div>

      {/* Scrollable content area — min-h-0 is required for flex children to shrink below content height */}
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>

      <NotificationCenter open={showNotifications} onClose={closeNotifications} />
      <InstallPrompt />
      <FeedbackButton />

      {/* Bottom Navigation — in-flow at the bottom of the flex column.
          No fixed/transform positioning needed, so it works in all browsers. */}
      <nav
        className="flex-shrink-0 bg-white border-t border-border z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {tabs.map(({ path, icon: Icon, label, highlight }) => {
            const active = location === path || location.startsWith(path + "/");
            const isTwinAi = path === "/twin-ai";
            const showNewBadge = isTwinAi && !twinAiOpened && !active;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => {
                  posthog?.capture("nav_tab_clicked", { tab: label });
                  if (isTwinAi && !twinAiOpened) {
                    try { localStorage.setItem(TWIN_AI_OPENED_KEY, "1"); } catch {}
                    setTwinAiOpened(true);
                  }
                }}
                className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all flex-1 ${
                  active
                    ? "text-primary"
                    : highlight
                      ? "text-violet-400 hover:text-violet-500"
                      : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {highlight && !active ? (
                  <div className="relative">
                    <Icon size={20} className="transition-transform" strokeWidth={1.8} />
                    {showNewBadge ? (
                      <span className="absolute -top-1 -right-2 bg-violet-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full leading-none">NEW</span>
                    ) : (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
                    )}
                  </div>
                ) : (
                  <Icon
                    size={20}
                    className={`transition-transform ${active ? "scale-110" : ""}`}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                )}
                <span className={`text-[9px] font-medium leading-none ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function TwinTabs({
  twins,
  activeTwinId,
  onSelect,
}: {
  twins: Array<{ id: number; name: string; label: string; colorTheme: string }>;
  activeTwinId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex gap-2 px-4 py-3 bg-white border-b border-border">
      {twins.map((twin) => (
        <button
          key={twin.id}
          onClick={() => onSelect(twin.id)}
          data-testid={`twin-tab-${twin.id}`}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTwinId === twin.id
              ? "text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          style={activeTwinId === twin.id ? { backgroundColor: twin.colorTheme } : {}}
        >
          {twin.name || twin.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0 ml-2">{right}</div>}
    </div>
  );
}
