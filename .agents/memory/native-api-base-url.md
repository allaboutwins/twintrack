---
name: Native API base URL
description: Capacitor Android/iOS require an absolute API URL — relative /api/… fails; InAppBrowserGate blocks native WebView without isNativePlatform() guard.
---

# Native API base URL

## The rule
`VITE_API_URL` must be set as a Codemagic env var and `setBaseUrl()` must be called at app startup (main.tsx) for any Capacitor native build to reach the production API server.

**Why:** On native Capacitor, `window.location.origin` is `capacitor://localhost`. Relative URLs like `/api/twins` resolve to `capacitor://localhost/api/twins` — a dead address. The Replit reverse proxy that handles `/api` routing only exists on the web host.

**How to apply:**
- `main.tsx` already calls `setBaseUrl(import.meta.env.VITE_API_URL)` when that var is set.
- In Codemagic: add `VITE_API_URL = https://<your-replit-domain>` as a secret env var in both android and iOS workflows.
- Do NOT set `VITE_API_URL` in the web `.env` — leaving it unset preserves relative-URL behavior through the Replit proxy.

## InAppBrowserGate false positive on Android
The gate's `wv)` user-agent pattern matches Capacitor's own Android WebView. Without the `isNativePlatform()` guard at the top of the component, every Android user sees the "Open in Chrome" error screen instead of the app.

Fix is already applied: `if (isNativePlatform()) return <>{children}</>` at the top of `InAppBrowserGate.tsx`.

## Files
- `artifacts/twintrack/src/main.tsx` — setBaseUrl call
- `artifacts/twintrack/src/components/InAppBrowserGate.tsx` — native guard
- `lib/api-client-react/src/custom-fetch.ts` — setBaseUrl / setAuthTokenGetter exports
- `codemagic.yaml` — VITE_API_URL documented in android-google-play vars comment
