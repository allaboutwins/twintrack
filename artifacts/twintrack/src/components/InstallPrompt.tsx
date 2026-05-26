import { useState, useEffect } from "react";
import { X, Download, Share, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallPrompt() {
  const { canInstall, promptInstall, dismiss, snooze } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  const isIOS = /iPhone|iPad/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosHintDismissed = localStorage.getItem("tt_ios_hint_dismissed");
  const showIOSHint = isIOS && !isStandalone && !iosHintDismissed;

  // Delay showing the prompt by 8 seconds so it doesn't interrupt first load
  useEffect(() => {
    if (!canInstall && !showIOSHint) return;
    const t = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(t);
  }, [canInstall, showIOSHint]);

  function dismissIOS() {
    localStorage.setItem("tt_ios_hint_dismissed", "1");
    setVisible(false);
    window.dispatchEvent(new Event("tt_ios_hint_dismissed"));
  }

  function handleDismiss() {
    setVisible(false);
    setTimeout(dismiss, 300);
  }

  function handleSnooze() {
    setVisible(false);
    setTimeout(snooze, 300);
  }

  async function handleInstall() {
    setVisible(false);
    await promptInstall();
  }

  return (
    <div
      className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] z-30"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {showIOSHint ? (
        <div className="bg-white border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Add TwinTrack to your Home Screen</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Tap <Share size={11} className="inline mb-0.5 mx-0.5" /> then <strong>"Add to Home Screen"</strong> — no App Store needed!
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-1.5">Works offline · Feels like a native app · Loads instantly</p>
            </div>
            <button onClick={dismissIOS} className="p-1 flex-shrink-0" aria-label="Dismiss">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-primary to-violet-500 rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl leading-none">🍒</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Install TwinTrack</p>
              <p className="text-xs text-white/80 leading-snug">Works offline · Instant launch · No App Store wait</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-primary rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                <Download size={12} />
                Install
              </button>
              <button onClick={handleSnooze} className="p-1.5" aria-label="Later">
                <X size={14} className="text-white/70" />
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="mt-2 w-full text-center text-[10px] text-white/50 hover:text-white/70 transition-colors"
          >
            Don't show again
          </button>
        </div>
      )}
    </div>
  );
}
