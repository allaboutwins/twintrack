import { useState } from "react";
import { usePlan } from "@/hooks/usePlan";

const DISMISSED_KEY = "tt_sub_banner_dismissed";

export default function SubscriptionSafetyBanner() {
  const { isUsingCachedPlan, verificationFailed, isPremium, isInTrial } = usePlan();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem(DISMISSED_KEY); } catch { return false; }
  });

  const shouldShow = !dismissed && (isUsingCachedPlan || verificationFailed);

  if (!shouldShow) return null;

  const hasPremiumAccess = isPremium || isInTrial;

  function dismiss() {
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setDismissed(true);
  }

  return (
    <div className="flex-shrink-0 px-4 py-2.5 bg-violet-50 border-b border-violet-200">
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5 flex-shrink-0">💜</span>
        <div className="flex-1 min-w-0">
          {isUsingCachedPlan && hasPremiumAccess ? (
            <>
              <p className="text-xs font-semibold text-violet-800 leading-snug">
                Subscription status temporarily unavailable
              </p>
              <p className="text-xs text-violet-700 leading-snug mt-0.5">
                Your access is preserved. We'll verify in the background.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-violet-800 leading-snug">
                Couldn't connect to verify your subscription
              </p>
              <p className="text-xs text-violet-700 leading-snug mt-0.5">
                Please check your connection. Your data is safe.
              </p>
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-violet-400 hover:text-violet-600 transition-colors p-0.5"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
