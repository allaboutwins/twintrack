/**
 * AppExperienceLayer
 *
 * Orchestrates first-time overlays shown to newly onboarded users:
 *   1. WelcomeOnboarding  — 4-slide app tour (first visit only)
 *   2. EarlyAccessBanner  — one-time "you're an Early Access member" popup
 *   3. ReviewPrompt       — shown after SHOW_AFTER_SESSIONS sessions
 *
 * All state is stored in localStorage so each overlay shows exactly once.
 * This component renders nothing while loading and never blocks the app.
 */

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { useGetOnboarding, getGetOnboardingQueryKey } from "@workspace/api-client-react";
import WelcomeOnboarding, { hasSeenWelcome } from "./WelcomeOnboarding";
import EarlyAccessBanner, { hasSeenEarlyAccess } from "./EarlyAccessBanner";
import ReviewPrompt, { shouldShowReview, trackSession } from "./ReviewPrompt";

type Layer = "welcome" | "early" | "review" | null;

function openFeedbackSheet() {
  const btn = document.querySelector<HTMLButtonElement>("[data-testid='feedback-button']");
  btn?.click();
}

export default function AppExperienceLayer() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const { data: onboarding, isLoading, isError } = useGetOnboarding(userId, {
    query: {
      queryKey: getGetOnboardingQueryKey(userId),
      enabled: !!userId,
      retry: false,
      staleTime: 10 * 60 * 1000,
    },
  });

  const [layer, setLayer] = useState<Layer>(null);
  const [ready, setReady] = useState(false);

  const resolve = useCallback(() => {
    if (!hasSeenWelcome()) { setLayer("welcome"); return; }
    if (!hasSeenEarlyAccess()) { setLayer("early"); return; }
    if (shouldShowReview()) { setLayer("review"); return; }
    setLayer(null);
  }, []);

  useEffect(() => {
    if (!userId || isLoading) return;
    // Only activate after the user has completed onboarding
    const onboarded = !isError && !!onboarding?.completedAt;
    if (!onboarded) return;

    // Track one session per page load
    trackSession();
    setReady(true);
  }, [userId, isLoading, isError, onboarding]);

  useEffect(() => {
    if (ready) resolve();
  }, [ready, resolve]);

  if (!ready || layer === null) return null;

  if (layer === "welcome") {
    return (
      <WelcomeOnboarding
        onDone={() => {
          if (!hasSeenEarlyAccess()) { setLayer("early"); }
          else if (shouldShowReview()) { setLayer("review"); }
          else { setLayer(null); }
        }}
      />
    );
  }

  if (layer === "early") {
    return (
      <EarlyAccessBanner
        onFeedback={() => { setLayer(null); setTimeout(openFeedbackSheet, 300); }}
        onDone={() => {
          if (shouldShowReview()) { setLayer("review"); }
          else { setLayer(null); }
        }}
      />
    );
  }

  if (layer === "review") {
    return (
      <ReviewPrompt
        onFeedback={() => { setLayer(null); setTimeout(openFeedbackSheet, 300); }}
        onDone={() => setLayer(null)}
      />
    );
  }

  return null;
}
