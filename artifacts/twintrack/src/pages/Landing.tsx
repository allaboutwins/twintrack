import { useLocation } from "wouter";
import { motion } from "framer-motion";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <img src={`${basePath}/logo.svg`} alt="TwinTrack" className="w-8 h-8" />
          <span className="font-bold text-xl text-primary tracking-wide">TwinTrack</span>
        </div>
        <button
          onClick={() => setLocation("/sign-in")}
          className="text-sm font-semibold text-accent hover:text-primary transition-colors px-4 py-2"
          data-testid="button-sign-in-header"
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 max-w-sm"
        >
          {/* Twin circles illustration */}
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute left-0 top-0 w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/40" />
            </div>
            <div className="absolute right-0 bottom-0 w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-secondary/40" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              The app that finally{" "}
              <span className="text-primary">understands</span>{" "}
              twin life.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Track sleep, feeding, diapers, and routines for both twins — calmly, simply, together.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {["Sleep Tracker", "Feeding Log", "Diaper Tracker", "Routines", "Learn"].map((f) => (
              <span key={f} className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setLocation("/sign-up")}
              className="w-full py-4 rounded-2xl bg-primary text-white font-semibold text-base shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
              data-testid="button-get-started"
            >
              Get Started — It's Free
            </button>
            <button
              onClick={() => setLocation("/sign-in")}
              className="w-full py-4 rounded-2xl border border-border bg-white text-foreground font-semibold text-base hover:bg-muted transition-all active:scale-95"
              data-testid="button-sign-in"
            >
              Sign In
            </button>
          </div>
        </motion.div>
      </main>

      {/* Bottom tagline */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Built with love for twin families everywhere
        </p>
      </footer>
    </div>
  );
}
