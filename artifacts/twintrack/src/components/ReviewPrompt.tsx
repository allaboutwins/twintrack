import { X, Heart } from "lucide-react";

const COUNT_KEY = "tt_session_count";
const SEEN_KEY = "tt_review_seen";
const SNOOZE_KEY = "tt_review_snooze_until";
const SHOW_AFTER_SESSIONS = 5;
const SNOOZE_DAYS = 14;

export function trackSession() {
  try {
    const count = parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
    localStorage.setItem(COUNT_KEY, String(count + 1));
  } catch {}
}

export function shouldShowReview(): boolean {
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
    const snoozeUntil = parseInt(localStorage.getItem(SNOOZE_KEY) ?? "0", 10);
    if (snoozeUntil && Date.now() < snoozeUntil) return false;
    const count = parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
    return count >= SHOW_AFTER_SESSIONS;
  } catch {
    return false;
  }
}

function markSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
}

function snooze() {
  try {
    localStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {}
}

interface Props {
  onFeedback: () => void;
  onDone: () => void;
}

export default function ReviewPrompt({ onFeedback, onDone }: Props) {
  function handleLove() {
    markSeen();
    onFeedback();
  }

  function handleLater() {
    snooze();
    onDone();
  }

  function handleNotReally() {
    markSeen();
    onFeedback();
  }

  return (
    <div className="fixed inset-0 z-[9996] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleLater} />
      <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl px-6 pt-6 pb-10 space-y-5 safe-area-pb">

        <button
          onClick={handleLater}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted"
          aria-label="Close"
        >
          <X size={14} className="text-muted-foreground" />
        </button>

        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-3xl">
            💕
          </div>
          <h3 className="font-bold text-foreground text-lg leading-tight">
            Loving TwinTrack?
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            You've been tracking your twins — we hope TwinTrack is making life a little easier.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleLove}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Heart size={15} fill="white" />
            Yes, I love it! Tell us more
          </button>
          <button
            onClick={handleNotReally}
            className="w-full py-3 rounded-2xl border border-border text-sm font-semibold text-foreground active:scale-[0.98] transition-all"
          >
            It needs work — here's my feedback
          </button>
          <button
            onClick={handleLater}
            className="w-full py-2 text-sm text-muted-foreground"
          >
            Ask me later
          </button>
        </div>
      </div>
    </div>
  );
}
