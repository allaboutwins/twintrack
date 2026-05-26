# TwinTrack — Apple App Store Submission Package

## App Identity

| Field | Value |
|-------|-------|
| **App Name** | TwinTrack — Twin Baby Tracker |
| **Bundle ID** | com.allaboutwins.twintrack |
| **SKU** | TWINTRACK-2025 |
| **Primary Language** | English (US) |
| **Category** | Primary: Health & Fitness · Secondary: Parenting |
| **Age Rating** | 4+ |
| **Price** | Free (with future in-app subscriptions) |

---

## Short Description (30 chars max)
```
Twin baby tracker for parents
```

## Subtitle (30 chars max)
```
Sleep · Feed · Diapers · More
```

## Promotional Text (170 chars max — can change without re-review)
```
Designed for the chaos and beauty of twin life. Log sleep, feeds, and diapers for both babies with one thumb — calmly, simply, together. 💕
```

## Description (4000 chars max)
```
TwinTrack is the only baby tracker built specifically for twins. Created by twin moms, for twin moms — we know you're doing this one-handed at 3am.

🍒 WHAT YOU CAN TRACK

Sleep — Start and stop nap or night sleep timers for each twin with a single tap. See daily totals, nap counts, and sleep trends at a glance. Never wonder "did Twin A nap today?" again.

Feeding — Log breast, bottle, formula, or solids feeds in seconds. Track counts and types per twin, per day. Know at a glance who needs feeding next.

Diapers — Big, thumb-friendly Wet / Dirty / Mixed buttons. Satisfying confirmation animation. Because at hour 14, every small win matters.

Routines — Morning, Bedtime, Outing, Daycare, and Meal checklists with progress bars. Tap through your routine without thinking.

Milestones — Capture first smiles, first rolls, first words. See both twins' milestone timelines side by side.

Dashboard — Your full-day snapshot: active sleep timers, today's feed and diaper counts, and a daily emotional check-in that actually sees how you're doing.

AI Assistant — Ask TwinAI anything from "why won't my twins sleep at the same time?" to "is this feeding schedule normal?"

📊 STATS & INSIGHTS

Trends, streaks, and patterns — so you can start to see what works for your family. Export your data anytime.

💕 BUILT FOR TWIN PARENTS

We don't pad TwinTrack with features that don't apply to twins. Everything in this app was designed around the reality of two babies, two schedules, and two parents surviving on love and coffee.

🔔 REMINDERS THAT ACTUALLY HELP

Optional push notifications for feed and nap reminders. Daily evening summary. No spam, no dark patterns.

📴 WORKS OFFLINE

TwinTrack works even when your signal doesn't. All your data syncs when you're back online.

🔒 PRIVATE & SECURE

Your family's data stays yours. We never sell data or use it for ads.

---
Made with love by the @AllAboutTwins team 💕
```

## Keywords (100 chars max, comma-separated)
```
twins,twin baby,baby tracker,newborn,parenting,sleep tracker,feeding log,diaper,twin mom,infant
```

---

## Screenshots Required

### iPhone 6.9" (1320×2868 or 1290×2796) — REQUIRED
Suggested screens (use Simulator or real device at 430×932 pt):
1. **Dashboard** — "Your twins' day at a glance"
2. **Sleep Tracker** — Twin A timer running + Twin B summary
3. **Feeding Tracker** — Both twins' daily feed counts
4. **Diaper Tracker** — Big Wet/Dirty/Mixed buttons
5. **Routines** — Morning routine with progress bar
6. **Milestones** — Side-by-side timeline (optional, if milestone data populated)

Screenshot caption overlays (add in Canva/Figma, size 1320×2868):
- "Track both twins. One tap." (Dashboard)
- "Sleep timer for each twin" (Sleep)
- "Know who needs feeding next" (Feeding)
- "Diaper tracking made thumb-friendly" (Diapers)
- "Morning routine, on autopilot" (Routines)

### iPhone 6.5" (1242×2688) — REQUIRED (covers older Plus/Max)
Same 5–6 screenshots, resized.

### iPad Pro 12.9" (2048×2732) — REQUIRED for universal apps
Same content but with iPad layout (centered, max-width card).

---

## App Preview Video (optional but recommended)
- Format: H.264 or HEVC
- Duration: 15–30 seconds
- Show: Dashboard → tap Twin A sleep start → tap feed log → diaper log → routines checklist
- Audio: Optional — calm lo-fi background

---

## App Store Connect — Build Settings

### App Capabilities needed (Xcode Signing & Capabilities tab):
- [x] Push Notifications
- [x] Background Modes → "Remote notifications"
- [x] Associated Domains → `applinks:app.allaboutwins.com`
- [x] Sign In with Apple (if adding later)

### Privacy — Data Types collected (App Privacy section):
| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| Name | Yes | Yes | No |
| Email Address | Yes | Yes | No |
| Health & Fitness (sleep/feed data) | Yes | Yes | No |
| Identifiers (User ID) | Yes | Yes | No |
| Usage Data (analytics) | Yes | No | No |

**Data Not Collected:** Precise Location, Contacts, Photos (unless camera permission used), Financial Info, Browsing History.

### App Privacy URL
```
https://app.allaboutwins.com/privacy
```

### Support URL
```
https://app.allaboutwins.com/support
```

### Marketing URL (optional)
```
https://allaboutwins.com
```

---

## Info.plist — Permission Strings (add to iOS project)

```xml
<!-- Push Notifications — no plist key needed, handled by capability -->

<!-- Camera (if photo upload added) -->
<key>NSCameraUsageDescription</key>
<string>TwinTrack uses your camera so you can add photos to your twins' milestones.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>TwinTrack accesses your photo library so you can add milestone photos for your twins.</string>

<!-- Photo Library Add Only -->
<key>NSPhotoLibraryAddUsageDescription</key>
<string>TwinTrack saves milestone photos to your photo library.</string>

<!-- Notifications (descriptive) -->
<key>NSUserNotificationsUsageDescription</key>
<string>TwinTrack sends gentle reminders for feeds, naps, and daily summaries to help you stay on top of your twins' routine.</string>
```

---

## Review Notes (for App Review team)
```
TwinTrack is a baby tracking application designed specifically for parents of twins.

Test account credentials:
  Email: [create a test account before submission]
  Password: [set before submission]

The app requires an account to save tracking data. All features are accessible after sign-up.

The app uses push notifications for feed and nap reminders — permission is requested in-app before the OS prompt.

No special hardware required for review. All core functionality (sleep, feed, diaper logging) works without push notification permission.
```

---

## TestFlight Setup

1. Upload build via Xcode Organizer → Validate → Distribute (App Store Connect)
2. Add internal testers (your team) immediately
3. For external beta: add group "Early Access Parents", invite via email
4. Beta review required for external testers (usually 1-2 days)

### TestFlight What to Test:
- [ ] Sign up + onboarding flow
- [ ] Add both twins in Settings
- [ ] Log sleep start/stop for each twin
- [ ] Log a feeding
- [ ] Log a diaper change
- [ ] Dashboard shows today's data
- [ ] App reopens to dashboard without sign-in prompt
- [ ] Push notification permission prompt appears after ~30s of use
- [ ] Test push notification fires from Settings
- [ ] App works with airplane mode (offline banner shows, data persists)

---

## Submission Checklist

- [ ] All required screenshot sizes uploaded
- [ ] App description spell-checked
- [ ] Keywords under 100 chars
- [ ] Privacy policy URL live at `app.allaboutwins.com/privacy`
- [ ] Support URL live
- [ ] Age rating questionnaire completed (4+)
- [ ] All Info.plist usage descriptions added
- [ ] Push notification entitlement added
- [ ] Background modes set (remote notifications)
- [ ] APNs certificate / key configured in App Store Connect
- [ ] Test account created for reviewers
- [ ] Review notes filled in
- [ ] Version number: 1.0.0 (build 1)
- [ ] Copyright: © 2025 All About Twins LLC
