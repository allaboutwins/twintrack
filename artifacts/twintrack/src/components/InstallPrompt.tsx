import { X, Download, Share } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  const isIOS = /iPhone|iPad/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Show iOS add-to-homescreen hint for first 3 days
  const iosHintDismissed = localStorage.getItem("tt_ios_hint_dismissed");
  const showIOSHint = isIOS && !isStandalone && !iosHintDismissed;

  if (!canInstall && !showIOSHint) return null;

  function dismissIOS() {
    localStorage.setItem("tt_ios_hint_dismissed", "1");
    window.dispatchEvent(new Event("tt_ios_hint_dismissed"));
  }

  if (showIOSHint) {
    return (
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] z-30">
        <div className="bg-white border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl leading-none">🍒</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Add to Home Screen</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Tap <Share size={11} className="inline mb-0.5" /> then <strong>"Add to Home Screen"</strong> for the best TwinTrack experience
              </p>
            </div>
            <button onClick={dismissIOS} className="p-1 flex-shrink-0" aria-label="Dismiss">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] z-30">
      <div className="bg-gradient-to-r from-primary to-violet-500 rounded-2xl shadow-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl leading-none">🍒</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Install TwinTrack</p>
            <p className="text-xs text-white/80 leading-snug">Add to your home screen for faster access</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={promptInstall}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-primary rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              <Download size={12} />
              Install
            </button>
            <button onClick={dismiss} className="p-1.5" aria-label="Dismiss">
              <X size={14} className="text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
