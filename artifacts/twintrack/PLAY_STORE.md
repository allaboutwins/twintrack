# TwinTrack — Google Play Store Submission Package

## App Identity

| Field | Value |
|-------|-------|
| **App Name** | TwinTrack — Twin Baby Tracker |
| **Package Name** | com.allaboutwins.twintrack |
| **Category** | Health & Fitness |
| **Content Rating** | Everyone |
| **Price** | Free |

---

## Short Description (80 chars max)
```
Track sleep, feeds & diapers for both twins — built for twin parents 💕
```

## Full Description (4000 chars max)
```
TwinTrack is the only baby tracker built specifically for twins. Created by twin moms, for twin moms — we know you're doing this one-handed at 3am.

🍒 WHAT YOU CAN TRACK

Sleep — Start and stop nap or night sleep timers for each twin with a single tap. See daily totals, nap counts, and sleep trends at a glance.

Feeding — Log breast, bottle, formula, or solids feeds in seconds. Track counts and types per twin, per day.

Diapers — Big, thumb-friendly Wet / Dirty / Mixed buttons with satisfying confirmation. Because at hour 14, every small win matters.

Routines — Morning, Bedtime, Outing, Daycare, and Meal checklists with progress bars. Tap through your routine without thinking.

Milestones — Capture first smiles, first rolls, first words. See both twins' milestone timelines side by side.

Dashboard — Your full-day snapshot: active sleep timers, today's feed and diaper counts, and a daily check-in that sees how you're really doing.

AI Assistant — Ask TwinAI anything: "why won't my twins sleep at the same time?" or "is this feeding schedule normal for 3-month-old twins?"

📊 STATS & INSIGHTS
Trends, streaks, and patterns — so you can see what works for your family.

💕 BUILT FOR TWIN PARENTS
Everything in TwinTrack was designed around the reality of two babies, two schedules, and two parents running on love and coffee. No bloat, no features that don't apply to twins.

🔔 REMINDERS THAT ACTUALLY HELP
Optional push notifications for feed and nap reminders. Daily 8pm summary. No spam.

📴 WORKS OFFLINE
TwinTrack works even when your signal doesn't. Data syncs when you're back online.

🔒 PRIVATE & SECURE
Your family's data stays yours. We never sell data or use it for advertising.

---
Made with love by the @AllAboutTwins team 💕
```

## Keywords / Tags (for Play Store search optimization)
```
twin baby tracker, twins, newborn, parenting app, sleep tracker, feeding log, diaper tracker, baby log, twin mom, multiples, infant tracker
```

---

## Screenshots Required

### Phone — 16:9 or 9:16 (1080×1920 recommended)
Minimum 2, maximum 8 screenshots:
1. Dashboard — "Your twins' day at a glance"
2. Sleep Tracker — timer running for both twins
3. Feeding Tracker — daily feed log per twin
4. Diaper Tracker — Wet/Dirty/Mixed buttons
5. Routines — morning checklist with progress
6. Stats — trend charts (optional)

### 7-inch Tablet (optional but recommended)
### 10-inch Tablet (optional but recommended)

### Feature Graphic — REQUIRED (1024×500 px)
- Background: gradient from `#da5a9f` to `#2e818c`
- Text: "TwinTrack" in Quicksand Bold, white
- Subtext: "The twin parenting app"
- Cherry 🍒 or twins illustration center-right

---

## Content Rating Questionnaire
- Violence: None
- Sexual Content: None
- Controlled substances: None
- Personal/sensitive data: User profile (name, email) — stored securely
- Intended for families with children under 13: **Yes** → complete Families policy

## Families Policy
TwinTrack is a parenting tool for **parents** of young children (not for children). It does not target children directly, does not contain child-directed advertising, and does not collect data from children.

---

## Android Permissions (AndroidManifest.xml)

```xml
<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Network state (offline banner) -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Push notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Camera (future milestone photos) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Read/Write external storage (Android ≤ 9) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />

<!-- Media images (Android 13+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- Vibration for notifications -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Prevent CPU sleeping during active sleep timer -->
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Receive push from FCM -->
<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
```

---

## Play Console — Data Safety Section

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Name | Yes | No | App functionality |
| Email address | Yes | No | Account management |
| App interactions | Yes | No | Analytics |
| App info and performance | Yes | No | Crash reporting |
| Health info (sleep/feed/diaper logs) | Yes | No | Core app functionality |

All data is encrypted in transit (HTTPS/TLS 1.3). Users can delete their account and all data.

**Data encryption:** Yes, in transit  
**Users can request deletion:** Yes — via Settings → Delete Account

---

## Firebase Cloud Messaging (FCM) Setup

1. Create Firebase project at `console.firebase.google.com`
2. Add Android app with package `com.allaboutwins.twintrack`
3. Download `google-services.json` → place in `android/app/`
4. Note Server Key → add to API server env as `FCM_SERVER_KEY`
5. In `capacitor.config.ts`, FCM is handled by `@capacitor/push-notifications`

---

## Internal Testing Track Checklist

- [ ] Upload signed AAB (Android App Bundle) via Play Console
- [ ] Complete content rating questionnaire
- [ ] Complete data safety section
- [ ] Add internal testers (email list)
- [ ] Install on physical Android device
- [ ] Test push notifications via Settings → Test Notification
- [ ] Test offline mode (airplane mode)
- [ ] Test app reopen / login persistence
- [ ] Verify APK targets API level 34+ (Android 14)

## Production Release Checklist

- [ ] All screenshot sizes uploaded
- [ ] Feature graphic (1024×500) uploaded
- [ ] Short description ≤ 80 chars
- [ ] Full description ≤ 4000 chars
- [ ] Privacy policy URL live
- [ ] Content rating complete
- [ ] Data safety complete
- [ ] Target SDK 34+
- [ ] Signing key set up (keep keystore backed up securely)
- [ ] Version: 1.0.0 (versionCode: 1)

---

## Build Command (from artifacts/twintrack/)
```bash
pnpm run build
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed Bundle/APK → Android App Bundle
```
