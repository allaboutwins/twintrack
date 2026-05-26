# TwinTrack — Capacitor Native App Setup

This document explains how to build and submit TwinTrack as a native iOS and Android app using Capacitor.

## Prerequisites

- Node.js 20+ and pnpm
- For iOS: macOS + Xcode 15+ + Apple Developer account ($99/yr)
- For Android: Android Studio + Google Play Developer account ($25 one-time)

---

## Step 1 — Install Capacitor

From the `artifacts/twintrack/` directory:

```bash
pnpm add -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
pnpm add -D @capacitor/splash-screen @capacitor/push-notifications
pnpm add -D @capacitor/status-bar @capacitor/keyboard
```

---

## Step 2 — Build the web app

```bash
pnpm --filter @workspace/twintrack run build
```

This outputs to `artifacts/twintrack/dist/public/` — the `webDir` set in `capacitor.config.ts`.

---

## Step 3 — Add native platforms

```bash
cd artifacts/twintrack
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` folders (gitignored; rebuild from source).

---

## Step 4 — Sync web build to native shells

After every web build:

```bash
npx cap sync
```

---

## Step 5 — Open in Xcode / Android Studio

```bash
npx cap open ios      # Opens in Xcode
npx cap open android  # Opens in Android Studio
```

---

## App Icon & Splash Screen

### Icons needed (place in `public/` for reference):

| Asset | Size | Use |
|-------|------|-----|
| `icon-192.png` | 192×192 | Android adaptive icon foreground |
| `icon-512.png` | 512×512 | Play Store listing |
| `apple-touch-icon.png` | 180×180 | iOS home screen / App Store |

### iOS icons (generate via `npx @capacitor/assets generate`):
Place a 1024×1024 `AppIcon.png` in `assets/` then run:

```bash
npx @capacitor/assets generate --ios
```

### Android icons:
```bash
npx @capacitor/assets generate --android
```

### Splash screens:
Place a 2732×2732 `splash.png` in `assets/` (centered logo on `#fdf8fa` background):

```bash
npx @capacitor/assets generate --ios --android
```

---

## Push Notifications (iOS)

1. Enable Push Notifications capability in Xcode → Signing & Capabilities
2. Register APNs certificate in Apple Developer Console
3. Upload the `.p8` key to your push service (or use the existing web push VAPID flow)

For Android, Firebase Cloud Messaging (FCM) is required:
1. Create a Firebase project → add Android app → download `google-services.json`
2. Place `google-services.json` in `android/app/`

---

## App Store Submission Checklist

### iOS App Store
- [ ] Bundle ID: `com.allaboutwins.twintrack`
- [ ] App name: TwinTrack
- [ ] Subtitle: The Twin Parenting App
- [ ] Category: Medical → Parenting
- [ ] Age rating: 4+
- [ ] Privacy policy URL required
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 14 Plus), 12.9" iPad
- [ ] App Preview video (optional but boosts conversion)

### Google Play Store
- [ ] Package: `com.allaboutwins.twintrack`
- [ ] Category: Parenting
- [ ] Content rating: Everyone
- [ ] Screenshots: Phone, 7" tablet, 10" tablet
- [ ] Feature graphic: 1024×500

---

## Permissions Needed

### iOS (add to `ios/App/App/Info.plist`)

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>TwinTrack sends gentle reminders to help you stay on track with your twins' feeding, sleep, and diaper changes.</string>

<key>NSCameraUsageDescription</key>
<string>TwinTrack can use your camera to add photos to your twins' milestones.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>TwinTrack can access your photos to add images to your twins' milestones.</string>
```

### Android (add to `android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

---

## Production Build

```bash
# 1. Build web assets
pnpm --filter @workspace/twintrack run build

# 2. Sync to native
cd artifacts/twintrack && npx cap sync

# 3. Open and archive in Xcode (iOS) or build signed APK/AAB in Android Studio
npx cap open ios
```

---

## Notes

- The `ios/` and `android/` directories are gitignored — always regenerate from `npx cap add`
- Keep `capacitor.config.ts` in sync with any domain/URL changes
- For live updates without App Store review, consider Capacitor's official live reload or Ionic Appflow
