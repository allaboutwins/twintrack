/**
 * InAppBrowserGate
 *
 * Detects Instagram, Facebook, TikTok, Snapchat, LinkedIn, and similar
 * in-app browsers (WebViews) and shows a friendly overlay asking the user
 * to open TwinTrack in their default browser.
 *
 * Why: These in-app browsers block third-party cookies and OAuth popups,
 * which breaks Clerk authentication and causes "security" errors for users.
 */

import { useState } from "react";

type InAppBrowser =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "snapchat"
  | "linkedin"
  | "twitter"
  | "wechat"
  | "line"
  | "other";

type Platform = "ios" | "android" | "other";

function detectInAppBrowser(): InAppBrowser | null {
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS|FBSS|Facebook/i.test(ua)) return "facebook";
  if (/BytedanceWebview|TikTok|musical_ly/i.test(ua)) return "tiktok";
  if (/Snapchat/i.test(ua)) return "snapchat";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Twitter/i.test(ua)) return "twitter";
  if (/MicroMessenger/i.test(ua)) return "wechat";
  if (/Line\//i.test(ua)) return "line";
  // Generic WebView detection
  if (
    /wv\)/i.test(ua) ||
    (/Android/i.test(ua) && /Version\/\d/i.test(ua) && !/Chrome\/\d/i.test(ua))
  ) {
    return "other";
  }
  return null;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function browserLabel(browser: InAppBrowser): string {
  switch (browser) {
    case "instagram": return "Instagram";
    case "facebook": return "Facebook";
    case "tiktok": return "TikTok";
    case "snapchat": return "Snapchat";
    case "linkedin": return "LinkedIn";
    case "twitter": return "X (Twitter)";
    case "wechat": return "WeChat";
    case "line": return "Line";
    default: return "this app";
  }
}

function browserIcon(browser: InAppBrowser): string {
  switch (browser) {
    case "instagram": return "📸";
    case "facebook": return "👥";
    case "tiktok": return "🎵";
    case "snapchat": return "👻";
    case "linkedin": return "💼";
    case "twitter": return "🐦";
    case "wechat": return "💬";
    case "line": return "💬";
    default: return "📱";
  }
}

type Props = {
  children: React.ReactNode;
};

export default function InAppBrowserGate({ children }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const browser = detectInAppBrowser();
  const platform = detectPlatform();

  // Not an in-app browser, or user explicitly dismissed — show the app
  if (!browser || dismissed) {
    return <>{children}</>;
  }

  const url = window.location.href;

  function handleCopy() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        // Fallback for browsers without clipboard API
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  }

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({ title: "TwinTrack", url })
        .catch(() => {});
    }
  }

  const iosSteps = getIosSteps(browser);
  const androidSteps = getAndroidSteps(browser);
  const steps = platform === "ios" ? iosSteps : platform === "android" ? androidSteps : null;
  const targetBrowser = platform === "ios" ? "Safari" : "Chrome";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#fdf8fa]">
      <div className="w-full max-w-[380px] mx-auto px-6 py-8 flex flex-col items-center text-center gap-5">

        {/* App identity */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
            <img src="/logo.svg" alt="TwinTrack" className="w-10 h-10" onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }} />
          </div>
          <p className="text-xl font-bold text-foreground">TwinTrack</p>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 w-full">
          <p className="text-sm font-semibold text-amber-800 mb-0.5">
            {browserIcon(browser)} Opened inside {browserLabel(browser)}
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            TwinTrack can't sign you in safely from inside {browserLabel(browser)}.
            Please open it in {platform === "ios" ? "Safari" : platform === "android" ? "Chrome" : "your browser"} for a secure experience.
          </p>
        </div>

        {/* Steps */}
        {steps && (
          <div className="w-full text-left space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-center">
              How to open in {targetBrowser}
            </p>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground leading-snug">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            onClick={handleCopy}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {copied ? "✓ Link Copied!" : "📋 Copy Link"}
          </button>

          {typeof navigator.share === "function" && (
            <button
              onClick={handleShare}
              className="w-full py-3 rounded-2xl border border-border bg-white text-foreground font-semibold text-sm active:scale-95 transition-all"
            >
              Share Link…
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Continue anyway (limited functionality)
          </button>
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This is a security requirement — in-app browsers can't store your login securely.
        </p>
      </div>
    </div>
  );
}

function getIosSteps(browser: InAppBrowser): string[] {
  switch (browser) {
    case "instagram":
      return [
        'Tap the ··· button in the top-right corner',
        'Tap "Open in Safari"',
        "Sign in normally — your data is safe",
      ];
    case "facebook":
      return [
        'Tap the ··· button in the top-right corner',
        'Tap "Open in Safari" or "Open in Browser"',
        "Sign in normally — your data is safe",
      ];
    case "tiktok":
      return [
        'Tap the ··· button (top right)',
        'Tap "Open in Safari"',
        "Sign in normally — your data is safe",
      ];
    default:
      return [
        'Look for a ··· or share button (top right)',
        'Tap "Open in Safari" or "Open in Browser"',
        "Sign in normally — your data is safe",
      ];
  }
}

function getAndroidSteps(browser: InAppBrowser): string[] {
  switch (browser) {
    case "instagram":
      return [
        "Tap the ··· button in the top-right corner",
        'Tap "Open in Chrome" or "Open in browser"',
        "Sign in normally — your data is safe",
      ];
    case "facebook":
      return [
        "Tap the ⋮ menu in the top-right corner",
        'Tap "Open in Chrome" or "Open with…"',
        "Sign in normally — your data is safe",
      ];
    case "tiktok":
      return [
        "Tap the ··· button (top right)",
        'Tap "Open in browser"',
        "Sign in normally — your data is safe",
      ];
    default:
      return [
        "Tap the ⋮ or share button (top right)",
        'Tap "Open in Chrome" or "Open in browser"',
        "Sign in normally — your data is safe",
      ];
  }
}
