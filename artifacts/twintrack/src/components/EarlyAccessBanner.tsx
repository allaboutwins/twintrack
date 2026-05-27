import { X } from "lucide-react";

const STORAGE_KEY = "tt_early_v1";

export function hasSeenEarlyAccess(): boolean {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
}

interface Props {
  onFeedback: () => void;
  onDone: () => void;
}

export default function EarlyAccessBanner({ onFeedback, onDone }: Props) {
  function dismiss() {
    markSeen();
    onDone();
  }

  function openFeedback() {
    markSeen();
    onFeedback();
  }

  return (
    <div className="fixed inset-0 z-[9997] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={dismiss} />
      <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl px-6 pt-6 pb-10 space-y-5 safe-area-pb">

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted"
          aria-label="Close"
        >
          <X size={14} className="text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl flex-shrink-0">
            🌟
          </div>
          <div>
            <p className="font-bold text-foreground">You're an Early Access member</p>
            <p className="text-xs text-muted-foreground mt-0.5">First in, shaping the future</p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-primary/5 rounded-2xl px-4 py-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed font-medium">
            Thank you for being one of the first twin parents to trust TwinTrack. 💕
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your experience shapes everything we build. Every bug you report, every feature you wish for — we read every single message.
          </p>
        </div>

        {/* What to expect */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">What to expect</p>
          <div className="space-y-1.5">
            {[
              { icon: "🚀", text: "New features released regularly" },
              { icon: "🐛", text: "Occasional rough edges — please tell us!" },
              { icon: "💕", text: "Priority support for Early Access members" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <span className="text-base leading-none">{icon}</span>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={openFeedback}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm active:scale-[0.98] transition-all"
          >
            Share your thoughts 💬
          </button>
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-2xl border border-border text-sm font-semibold text-muted-foreground active:scale-[0.98] transition-all"
          >
            Got it, let's track! 🍒
          </button>
        </div>
      </div>
    </div>
  );
}
