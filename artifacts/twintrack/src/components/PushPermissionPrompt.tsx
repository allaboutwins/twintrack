import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

const STORAGE_KEY = "tt_push_asked";

interface Props {
  onGrant?: () => void;
}

export default function PushPermissionPrompt({ onGrant }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if: notifications API exists, not yet granted/denied, not already asked
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Show after 30s so user has engaged with the app first
    const t = setTimeout(() => setVisible(true), 30000);
    return () => clearTimeout(t);
  }, []);

  async function handleAllow() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        onGrant?.();
      }
    } catch {
      // permission API not available
    }
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleDismiss}
      />
      <div
        className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-8"
        style={{
          animation: "slideUpSheet 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
        }}
      >
        <style>{`
          @keyframes slideUpSheet {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-muted text-muted-foreground"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell size={28} className="text-primary" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">Stay in the loop</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Get gentle reminders for feeds, nap times, and daily summaries — so nothing slips through the cracks.
            </p>
          </div>

          <div className="w-full space-y-2 text-left mt-1">
            {[
              { emoji: "⏰", text: "Feed & nap reminders" },
              { emoji: "📊", text: "Daily twin summary at 8 PM" },
              { emoji: "💕", text: "Milestone & routine nudges" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-xl">
                <span className="text-lg leading-none">{emoji}</span>
                <span className="text-sm font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>

          <div className="w-full space-y-2 mt-2">
            <button
              onClick={handleAllow}
              className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm active:scale-[0.98] transition-all"
            >
              Turn on notifications
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 text-sm text-muted-foreground font-medium"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
