import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<"accepted" | "dismissed" | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("tt_install_dismissed");
    if (dismissed) setIsDismissed(true);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Track if already installed (appinstalled fires when user installs)
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setInstallOutcome(choice.outcome);
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      // Track install acceptance in localStorage for analytics
      localStorage.setItem("tt_install_accepted_at", new Date().toISOString());
    } else {
      // Soft dismiss for 7 days if they decline
      const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("tt_install_snoozed_until", String(until));
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem("tt_install_dismissed", "1");
    setIsDismissed(true);
  };

  const snooze = () => {
    // Snooze for 3 days without permanent dismissal
    const until = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem("tt_install_snoozed_until", String(until));
    setIsDismissed(true);
  };

  // Check if snoozed
  const snoozedUntil = Number(localStorage.getItem("tt_install_snoozed_until") ?? "0");
  const isSnoozed = snoozedUntil > Date.now();

  const canInstall = !isInstalled && !isDismissed && !isSnoozed && deferredPrompt !== null;

  return { canInstall, isInstalled, installOutcome, promptInstall, dismiss, snooze };
}
