---
name: Capacitor native app setup
description: How TwinTrack is configured for Capacitor iOS/Android builds
---

Capacitor config lives at `artifacts/twintrack/capacitor.config.ts`.
- appId: `com.allaboutwins.twintrack`
- webDir: `dist/public` (Vite build output)
- Plugins configured: SplashScreen, PushNotifications, LocalNotifications, StatusBar, Keyboard

Full step-by-step build and App Store submission guide is in `artifacts/twintrack/CAPACITOR.md`.

**Key steps:**
1. `pnpm add -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android`
2. `pnpm --filter @workspace/twintrack run build`
3. `npx cap add ios && npx cap add android` (from artifacts/twintrack/)
4. `npx cap sync` after every web build
5. `npx cap open ios` → archive in Xcode

**Why:** ios/ and android/ folders are gitignored; always regenerate from `npx cap add`. The capacitor.config.ts is the source of truth for app metadata.
