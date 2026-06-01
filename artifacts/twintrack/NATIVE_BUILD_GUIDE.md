# TwinTrack — Native Build & App Store Submission Guide

> Everything you need to go from the Replit project → TestFlight → App Store and
> Google Play Internal Testing → Production.
>
> **You need a Mac for iOS builds.** Android builds can be done on Mac, Windows, or Linux.

---

## Prerequisites

| Tool | Where to get it | Required for |
|------|----------------|-------------|
| Node.js 20+ | nodejs.org | Both |
| pnpm 9+ | `npm i -g pnpm` | Both |
| Xcode 16+ | Mac App Store | iOS only |
| Android Studio Meerkat+ | developer.android.com | Android |
| Apple Developer account | developer.apple.com | iOS |
| Google Play Developer account | play.google.com/console | Android |

---

## Step 1 — Download the project from Replit

In Replit: **⋮ menu → Download as ZIP**, or use the Git integration to clone.

```bash
# Unzip and enter the project
unzip twintrack.zip && cd workspace
```

---

## Step 2 — Install dependencies

```bash
pnpm install
```

---

## Step 3 — Build the web app

```bash
pnpm --filter @workspace/twintrack run build
```

This outputs the compiled web app to `artifacts/twintrack/dist/public/` — the folder Capacitor wraps.

---

## Step 4 — Add native platforms (first time only)

```bash
cd artifacts/twintrack

# iOS
pnpm run cap:add:ios

# Android
pnpm run cap:add:android
```

> These create `ios/` and `android/` folders. They are git-ignored — regenerate them any time you need a fresh native project.

---

## Step 5 — Generate app icons and splash screens

Your master assets are already in `resources/`:
- `resources/icon.png` — 1024×1024 app icon
- `resources/splash.png` — 2732×2732 splash screen

Run the generator:

```bash
pnpm run cap:assets
```

This automatically creates every required size for both iOS and Android:
- iOS: all `AppIcon` sizes in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: all `mipmap-*` densities in `android/app/src/main/res/`
- Android adaptive icon layers (foreground + background)
- iOS and Android splash screens

---

## Step 6 — Sync web assets to native projects

```bash
pnpm run cap:sync
```

Run this every time you rebuild the web app or change Capacitor plugins.

---

## iOS — TestFlight Build

### 6a. Open in Xcode

```bash
pnpm run cap:ios
```

### 6b. Configure signing in Xcode

1. Select the **App** target in the project navigator
2. Go to **Signing & Capabilities**
3. Set **Team** → your Apple Developer team
4. Verify **Bundle Identifier**: `com.allaboutwins.twintrack`
5. Set **Version** (e.g. `1.0.0`) and **Build** (e.g. `1`)

### 6c. Create an App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Apps → +** → New App
3. Platform: **iOS**, Name: **TwinTrack**
4. Bundle ID: `com.allaboutwins.twintrack`
5. SKU: `twintrack-001`
6. Primary language: **English (U.S.)**

### 6d. Archive and upload

1. In Xcode: select **Any iOS Device (arm64)** as the build target
2. Menu: **Product → Archive**
3. When done: **Distribute App → App Store Connect → Upload**
4. Follow the wizard (keep defaults for most options)
5. Wait ~10 minutes for processing
6. In App Store Connect → **TestFlight** → your build will appear
7. Add yourself as an internal tester to install immediately

### 6e. App Store metadata (from APP_STORE.md)

Fill in on App Store Connect under **App Information** and **Prepare for Submission**:

- **Name:** TwinTrack — Twin Baby Tracker
- **Subtitle:** Sleep, Feed & Diaper Log
- **Category:** Health & Fitness (primary) / Lifestyle (secondary)
- **Keywords:** `twins,baby tracker,newborn,sleep log,feeding tracker,diaper log,twin parents,infant schedule`
- **Description:** (copy from APP_STORE.md in the project)
- **Screenshots:** Required — 6.5" iPhone (1284×2778), 5.5" iPhone (1242×2208), 12.9" iPad (2048×2732). Use the Simulator to capture these.

---

## Android — Internal Testing Build

### 7a. Open in Android Studio

```bash
pnpm run cap:android
```

### 7b. Create a keystore (first time only — keep this file safe forever)

```bash
keytool -genkey -v \
  -keystore twintrack-release.jks \
  -alias twintrack \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store `twintrack-release.jks` securely — **losing it means you can never update your app on Play Store.**

### 7c. Configure signing in Android Studio

1. Open **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle (.aab)** → Next
3. Point to your `twintrack-release.jks` keystore
4. Enter the alias (`twintrack`) and passwords
5. Select **release** build variant → Finish
6. The `.aab` file will be at `android/app/release/app-release.aab`

### 7d. Create the app in Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. **All apps → Create app**
3. App name: **TwinTrack**
4. Default language: **English (United States)**
5. App or game: **App** | Free or paid: **Free**
6. Complete the **App content** declarations (data safety, target audience, etc.)

### 7e. Upload to Internal Testing

1. In Play Console: **Testing → Internal testing → Create new release**
2. Upload your `app-release.aab`
3. Add release notes (e.g. "Initial internal test build")
4. **Save → Review release → Start rollout to Internal testing**
5. Add testers via the **Testers** tab using their Gmail addresses

### 7f. Play Store metadata (from PLAY_STORE.md)

- **Short description** (80 chars): `Track sleep, feeding & diapers for both your twins — effortlessly.`
- **Full description:** (copy from PLAY_STORE.md in the project)
- **Category:** Health & Fitness
- **Tags:** baby tracker, newborn, twins, parenting, sleep log
- **Graphics required:**
  - Feature graphic: 1024×500 PNG
  - Icon: 512×512 PNG (same design as your app icon, already in `resources/icon.png` — resize to 512)
  - Screenshots: minimum 2, recommended 8. Phone screenshots at 1080×1920 or similar 16:9.

---

## Push Notifications Setup

### iOS (APNs)
1. In Apple Developer Portal: **Certificates → + → Apple Push Notification service (Sandbox & Production)**
2. Download the `.p12` certificate
3. In your backend, configure the APNs provider with this certificate

### Android (FCM)
1. Create a project in [Firebase Console](https://console.firebase.google.com)
2. Add an Android app with package `com.allaboutwins.twintrack`
3. Download `google-services.json` → place at `android/app/google-services.json`
4. `pnpm run cap:sync` to include it in the build

---

## Updating the app after changes

Every time you make changes to TwinTrack and want to push a new build:

```bash
# 1. Rebuild the web app
pnpm --filter @workspace/twintrack run build

# 2. Sync to native projects
cd artifacts/twintrack && pnpm run cap:sync

# 3. Bump version + build number in Xcode / build.gradle

# 4. Archive (iOS) or Generate Signed Bundle (Android) and upload
```

---

## Quick reference — key identifiers

| Field | Value |
|-------|-------|
| Bundle ID / App ID | `com.allaboutwins.twintrack` |
| App Name | TwinTrack |
| Capacitor version | 8.x |
| Web output dir | `artifacts/twintrack/dist/public` |
| Icon source | `artifacts/twintrack/resources/icon.png` |
| Splash source | `artifacts/twintrack/resources/splash.png` |
| iOS min deployment | iOS 14 |
| Android min SDK | API 24 (Android 7.0) |

---

## Files already prepared for you

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | App ID, plugins, native behavior settings |
| `resources/icon.png` | 1024×1024 master icon |
| `resources/splash.png` | 2732×2732 master splash |
| `APP_STORE.md` | Full App Store Connect copy (description, keywords, subtitle) |
| `PLAY_STORE.md` | Full Google Play Console copy |
| `PRIVACY.md` | Privacy policy (link in both stores) |
| `TERMS.md` | Terms of service |
