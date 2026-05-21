import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import logoAat from "../assets/logo-aat.png";
import { Home, Moon, Utensils, GraduationCap, Heart, Settings, MessageCircle, X, Sparkles } from "lucide-react";
import { useUser } from "@clerk/react";
import { useSubmitFeedback } from "@workspace/api-client-react";

interface UpdateItem {
  id: number;
  title: string;
  description: string;
  emoji: string;
  publishedAt: string;
}

const UPDATES_SEEN_KEY = "tt_updates_seen";

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
        className="fixed bottom-[76px] right-3 z-40 flex items-center gap-1.5 bg-white border border-border/70 shadow-md rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
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

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/sleep", icon: Moon, label: "Sleep" },
  { path: "/feeding", icon: Utensils, label: "Feed" },
  { path: "/milestones", icon: Heart, label: "Memories" },
  { path: "/twin-ai", icon: Sparkles, label: "Twin AI", highlight: true },
  { path: "/learn", icon: GraduationCap, label: "Learn" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [showUpdates, setShowUpdates] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const baseUrl = useRef((import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")).current;

  useEffect(() => {
    fetch(`${baseUrl}/api/app-updates?limit=30`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: UpdateItem[]) => {
        setUpdates(data);
        const lastSeen = localStorage.getItem(UPDATES_SEEN_KEY);
        if (!lastSeen) {
          setHasUnread(data.length > 0);
        } else {
          setHasUnread(data.some((u) => new Date(u.publishedAt) > new Date(lastSeen)));
        }
      })
      .catch(() => {});
  }, [baseUrl]);

  function openUpdates() {
    setShowUpdates(true);
    setHasUnread(false);
    localStorage.setItem(UPDATES_SEEN_KEY, new Date().toISOString());
  }

  return (
    <div className="relative flex flex-col min-h-[100dvh] max-w-[430px] mx-auto bg-background">
      {/* Top header */}
      <div className="bg-white border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-16">
          <img src={logoAat} alt="All About Twins" className="h-16 w-auto" />
          <div className="flex items-center">
            <button
              onClick={openUpdates}
              className="relative p-2 rounded-full hover:bg-muted/60 transition-colors"
              aria-label="What's New"
            >
              <span className="text-base leading-none select-none">🍒</span>
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-white" />
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


      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* What's New Drawer */}
      {showUpdates && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowUpdates(false)} />
          <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl max-h-[85dvh] flex flex-col safe-area-pb">
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-lg leading-none">🍒</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground leading-tight">What's New</h3>
                  <p className="text-xs text-muted-foreground">TwinTrack updates &amp; milestones</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpdates(false)}
                className="p-1.5 rounded-lg bg-muted"
                aria-label="Close"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {updates.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-4xl">🍒</span>
                  <p className="text-sm text-muted-foreground mt-3">Updates coming soon!</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {updates.map((u, i) => (
                    <div
                      key={u.id}
                      className={`flex items-start gap-3.5 py-4 ${
                        i < updates.length - 1 ? "border-b border-border/50" : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl leading-none">{u.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{u.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{u.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 px-5 py-3 border-t border-border/50">
              <p className="text-center text-xs text-muted-foreground">
                Built with 💕 for twin families everywhere
              </p>
            </div>
          </div>
        </div>
      )}

      <FeedbackButton />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border safe-area-pb">
        <div className="flex items-center justify-around px-1 py-1.5">
          {tabs.map(({ path, icon: Icon, label, highlight }) => {
            const active = location === path || location.startsWith(path + "/");
            return (
              <Link
                key={path}
                to={path}
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
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
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
