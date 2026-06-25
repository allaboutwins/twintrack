import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";

const DISMISSED_KEY = "tt_paypal_banner_v1";

export default function PayPalAnnouncementBanner() {
  const { plan } = usePlan();
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
      <span className="text-base leading-none flex-shrink-0">💳</span>
      <p className="flex-1 font-medium leading-snug">
        PayPal now available —{" "}
        <span className="font-bold">lock in Founding Moms $39/year</span>{" "}
        before this offer ends.
      </p>
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
