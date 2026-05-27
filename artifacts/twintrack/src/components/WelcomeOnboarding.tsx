import { useState } from "react";

const STORAGE_KEY = "tt_welcome_v1";

export function hasSeenWelcome(): boolean {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
}

const SLIDES = [
  {
    emoji: "🍒",
    title: "Welcome to TwinTrack",
    body: "Made for twin families. Everything your babies need — tracked together, effortlessly.",
    color: "#da5a9f",
  },
  {
    emoji: "🍼",
    title: "Track both babies",
    body: "Log feeds, start sleep timers, and record diapers for both twins in seconds. One tap, done.",
    color: "#2e818c",
  },
  {
    emoji: "📊",
    title: "Stats & milestones",
    body: "See daily totals, weekly trends, and capture milestone moments your family will treasure forever.",
    color: "#9b59b6",
  },
  {
    emoji: "✨",
    title: "Twin AI & Learn",
    body: "Get personalised AI tips and curated expert videos as your twins grow week by week.",
    color: "#e67e22",
  },
];

interface Props {
  onDone: () => void;
}

export default function WelcomeOnboarding({ onDone }: Props) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  function next() {
    if (isLast) {
      markSeen();
      onDone();
    } else {
      setSlide((s) => s + 1);
    }
  }

  function skip() {
    markSeen();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-between bg-[#fdf8fa] px-6 py-10 max-w-[430px] mx-auto">

      {/* Skip */}
      <div className="w-full flex justify-end">
        {!isLast && (
          <button
            onClick={skip}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          >
            Skip
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 w-full">
        <div
          className="w-24 h-24 rounded-[32px] flex items-center justify-center text-5xl transition-all duration-300"
          style={{ backgroundColor: current.color + "20" }}
        >
          {current.emoji}
        </div>

        <div className="space-y-3 max-w-xs">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {current.title}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* What you'll find */}
        {slide === 0 && (
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-2">
            {[
              { icon: "🍼", label: "Feed" },
              { icon: "😴", label: "Sleep" },
              { icon: "💧", label: "Diapers" },
              { icon: "📊", label: "Stats" },
              { icon: "✨", label: "Twin AI" },
              { icon: "📚", label: "Learn" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="bg-white border border-border rounded-xl py-2.5 flex flex-col items-center gap-1 shadow-sm"
              >
                <span className="text-xl leading-none">{icon}</span>
                <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="w-full space-y-4">
        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="rounded-full transition-all"
              style={{
                width: i === slide ? 20 : 8,
                height: 8,
                backgroundColor: i === slide ? current.color : "#e8d5e4",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full py-4 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-all"
          style={{ backgroundColor: current.color }}
        >
          {isLast ? "Get started 🍒" : "Next →"}
        </button>
      </div>
    </div>
  );
}
