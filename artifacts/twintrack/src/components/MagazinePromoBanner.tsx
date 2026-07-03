import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";

const DISMISSED_KEY = "tt_magazine_banner_v1";

export default function MagazinePromoBanner() {
  const { plan } = usePlan();
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true);
    } catch {}
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setVisible(false);
  }

  if (!visible || plan === "premium") return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 text-white text-sm">
      <span className="text-base leading-none flex-shrink-0">📖</span>
      <button
        type="button"
        onClick={() => {
          setLocation("/learn");
          dismiss();
        }}
        className="flex-1 text-left font-medium leading-snug"
      >
        The new <span className="font-bold">Jul/Aug 2026 Twins Magazine</span> is here — real
        stories from twin parents just like you.{" "}
        <span className="font-bold underline underline-offset-2">Read The New Issue →</span>
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
