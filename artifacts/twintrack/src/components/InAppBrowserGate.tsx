/**
 * InAppBrowserGate
 *
 * Detects Instagram, Facebook, TikTok and similar in-app browsers and shows
 * a friendly, non-scary screen explaining how to open in Safari/Chrome.
 *
 * Key design principle: users see this and think the link is BROKEN.
 * Every word and button must make clear: the link works, one step needed.
 */

import { useState } from "react";
import { isNativePlatform } from "@/lib/native";

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
    case "twitter": return "X";
    case "wechat": return "WeChat";
    case "line": return "Line";
    default: return "this app";
  }
}

function tryOpenInBrowser(url: string, platform: Platform) {
  if (platform === "ios") {
    // iOS: x-safari-https scheme opens directly in Safari from some in-app browsers
    const safariUrl = url.replace(/^https:\/\//, "x-safari-https://");
    window.location.href = safariUrl;
  } else if (platform === "android") {
    // Android: intent:// scheme opens in Chrome
    const intent = url.replace(/^https?:\/\//, "intent://").replace(/\/$/, "") +
      "#Intent;scheme=https;package=com.android.chrome;end";
    window.location.href = intent;
  }
}

type Props = {
  children: React.ReactNode;
};

export default function InAppBrowserGate({ children }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openTried, setOpenTried] = useState(false);

  // Never show the gate inside the Capacitor native app — the wv) user-agent
  // pattern that detects Android WebViews would otherwise match Capacitor's
  // own WebView and block the entire app with the "open in Chrome" screen.
  if (isNativePlatform()) return <>{children}</>;

  const browser = detectInAppBrowser();
  const platform = detectPlatform();

  if (!browser || dismissed) {
    return <>{children}</>;
  }

  const url = window.location.href;
  const targetBrowser = platform === "ios" ? "Safari" : "Chrome";
  const step = getOpenStep(browser, platform);

  function handleCopy() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
  }

  function handleOpenInBrowser() {
    setOpenTried(true);
    tryOpenInBrowser(url, platform);
    // If it doesn't open automatically, fall back to copy
    setTimeout(() => handleCopy(), 600);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#fdf8fa]">
      {/* Top — reassuring brand */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-16 pb-4 gap-3">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <span className="text-3xl leading-none">🍒</span>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">TwinTrack works!</p>
          <p className="text-sm text-muted-foreground mt-0.5">One quick step to open it</p>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl px-6 pt-6 pb-10 space-y-5 shadow-xl">

        {/* What's happening — no scary language */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
          <span className="text-xl leading-none mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-900">
              Opened inside {browserLabel(browser)}
            </p>
            <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
              {browserLabel(browser)}'s browser can't keep you signed in securely.
              Open TwinTrack in {targetBrowser} — it only takes a second.
            </p>
          </div>
        </div>

        {/* Single clear step */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            How to open in {targetBrowser}
          </p>
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3.5">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{step}</p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="space-y-3">
          {platform !== "other" && (
            <button
              onClick={handleOpenInBrowser}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {openTried ? "✓ Trying to open…" : `Open in ${targetBrowser}`}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="w-full py-3.5 rounded-2xl border-2 border-border bg-white text-foreground font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {copied
              ? "✓ Link copied — paste it in " + targetBrowser
              : "📋 Copy link to open manually"}
          </button>

          {copied && (
            <p className="text-center text-xs text-primary font-semibold animate-pulse">
              Now open {targetBrowser} and paste the link in the address bar 👆
            </p>
          )}
        </div>

        {/* Escape hatch — make it visible, not hidden */}
        <div className="text-center pt-1">
          <button
            onClick={() => setDismissed(true)}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          >
            Continue in {browserLabel(browser)} (may have login issues)
          </button>
        </div>
      </div>
    </div>
  );
}

function getOpenStep(browser: InAppBrowser, platform: Platform): string {
  if (platform === "ios") {
    switch (browser) {
      case "facebook":
        return 'Tap the ··· button (top right of the browser bar) → "Open in Safari"';
      case "instagram":
        return 'Tap the ··· button (top right) → "Open in external browser"';
      case "tiktok":
        return 'Tap the ··· button (top right) → "Open in Safari"';
      default:
        return 'Tap the ··· or share button → "Open in Safari"';
    }
  } else if (platform === "android") {
    switch (browser) {
      case "facebook":
        return 'Tap the ⋮ menu (top right) → "Open in Chrome" or "Open with…"';
      case "instagram":
        return 'Tap the ··· button (top right) → "Open in external browser"';
      case "tiktok":
        return 'Tap the ··· button (top right) → "Open in browser"';
      default:
        return 'Tap the ⋮ or share button → "Open in Chrome"';
    }
  } else {
    return 'Look for a ··· or share button and choose "Open in browser"';
  }
}
