import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/react";
import { X, Bell, BellOff, Check, CheckCheck, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  sentAt: string;
  openedAt: string | null;
  isRead: boolean;
  url: string | null;
}

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const WHATS_NEW_KEY = "tt_whats_new_v3";
const WHATS_NEW_UPDATES = [
  { icon: "📊", text: "Stats tab — daily & weekly charts for sleep, feeds, and diapers" },
  { icon: "🟢", text: "Live user presence — admins can now see who's online in real time" },
  { icon: "🛡️", text: "Blank-screen recovery — automatic fix screen if the app fails to load" },
  { icon: "🔔", text: "Smart notification scheduler — quiet hours and context-aware reminders" },
];

function WhatsNewCard() {
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(WHATS_NEW_KEY); } catch { return false; }
  });
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    try { localStorage.setItem(WHATS_NEW_KEY, "1"); } catch {}
    setDismissed(true);
  }

  const visible = expanded ? WHATS_NEW_UPDATES : WHATS_NEW_UPDATES.slice(0, 3);
  const hasMore = WHATS_NEW_UPDATES.length > 3;

  return (
    <div className="mx-4 mt-3 mb-1 rounded-2xl border border-primary/20 bg-primary/4 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🍒</span>
          <p className="text-xs font-bold text-primary uppercase tracking-wide">What's New</p>
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg hover:bg-primary/10 transition-colors"
          aria-label="Dismiss"
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      </div>
      <div className="px-4 pb-3 space-y-1.5 mt-1">
        {visible.map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-2">
            <span className="text-sm leading-none mt-0.5 flex-shrink-0">{icon}</span>
            <p className="text-xs text-foreground leading-snug">{text}</p>
          </div>
        ))}
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] font-semibold text-primary mt-1 hover:underline"
          >
            Show more →
          </button>
        )}
      </div>
    </div>
  );
}

const TYPE_EMOJI: Record<string, string> = {
  feeding: "🍼",
  sleep: "😴",
  diaper: "💧",
  pumping: "🫙",
  medication: "💊",
  milestone: "⭐",
  insight: "💡",
  streak: "🔥",
  weekly: "📊",
  test: "🍒",
  default: "🔔",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { user } = useUser();
  const { permission, subscription, loading: pushLoading, subscribe, unsubscribe, sendTest } = usePushNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const hasFetched = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setFetching(true);
    try {
      const res = await fetch(`${BASE_URL}/api/notifications?limit=30`);
      if (res.ok) {
        const data = await res.json() as NotificationItem[];
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.isRead).length);
      }
    } finally {
      setFetching(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (open && !hasFetched.current) {
      hasFetched.current = true;
      void fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Expose unread count for the badge
  useEffect(() => {
    if (user?.id) {
      fetch(`${BASE_URL}/api/notifications?limit=50`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: NotificationItem[]) => {
          setUnreadCount(data.filter((n) => !n.isRead).length);
        })
        .catch(() => {});
    }
  }, [user?.id]);

  async function markAllRead() {
    await fetch(`${BASE_URL}/api/notifications/read-all`, { method: "POST" });
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: number) {
    await fetch(`${BASE_URL}/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((ns) => ns.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleTest() {
    await sendTest();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  if (!open) return null;

  const isSubscribed = subscription !== null;
  const isSupported = permission !== "unsupported";

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl max-h-[93dvh] flex flex-col safe-area-pb">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-lg leading-none">🍒</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground leading-tight">Notifications</h3>
              <p className="text-xs text-muted-foreground">Reminders &amp; insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:opacity-80"
              >
                <CheckCheck size={13} />
                All read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg bg-muted" aria-label="Close">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Push notification status + enable card */}
        {isSupported && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-border/50">
            {!isSubscribed ? (
              <div className="bg-gradient-to-r from-primary/8 to-violet-50 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Enable reminders</p>
                  <p className="text-xs text-muted-foreground leading-snug">Get smart alerts for feeds, sleep &amp; more</p>
                </div>
                <button
                  onClick={subscribe}
                  disabled={pushLoading || permission === "denied"}
                  className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {permission === "denied" ? "Blocked" : pushLoading ? "…" : "Enable"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-1">
                <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Bell size={13} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-700">Notifications active</p>
                  <p className="text-[10px] text-muted-foreground">Push reminders are enabled on this device</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleTest}
                    disabled={testSent}
                    className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-lg px-2 py-1 active:scale-95 transition-all"
                  >
                    {testSent ? "Sent ✓" : "Test"}
                  </button>
                  <button
                    onClick={unsubscribe}
                    disabled={pushLoading}
                    className="p-1.5 rounded-lg bg-muted hover:bg-red-50 transition-colors"
                    aria-label="Disable notifications"
                  >
                    <BellOff size={12} className="text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </div>
            )}
            {permission === "denied" && (
              <p className="text-[10px] text-amber-600 mt-2 px-1">
                Notifications are blocked. Enable them in your browser settings.
              </p>
            )}
          </div>
        )}

        {/* What's New card — shown once, above the scrollable list so
            notifications are immediately visible without scrolling */}
        <WhatsNewCard />

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {fetching ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-14 text-center space-y-3 px-6">
              <span className="text-5xl block">🍒</span>
              <p className="font-semibold text-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isSubscribed
                  ? "You're all set! Reminders will appear here when triggered."
                  : "Enable notifications above to get smart reminders."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.isRead) void markRead(n.id); }}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                    n.isRead ? "" : "bg-primary/[0.03]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                    n.isRead ? "bg-muted/50" : "bg-primary/10"
                  }`}>
                    {TYPE_EMOJI[n.type] ?? TYPE_EMOJI.default}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.isRead ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.sentAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* iOS install hint */}
        {!isSubscribed && /iPhone|iPad/i.test(navigator.userAgent) && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-border/50 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <Smartphone size={14} className="text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-snug">
                On iPhone, add TwinTrack to your Home Screen first to enable notifications.
              </p>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 px-5 py-3 border-t border-border/50">
          <p className="text-center text-xs text-muted-foreground">Built with 💕 for twin families everywhere</p>
        </div>
      </div>
    </div>
  );
}

export function useNotificationUnreadCount(): number {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    fetch(`${BASE}/api/notifications?limit=50`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NotificationItem[]) => setCount(data.filter((n) => !n.isRead).length))
      .catch(() => {});
  }, [user?.id]);

  return count;
}
