# TwinTrack — Android Google Play Launch Checklist

Work through this top to bottom. Each section has a clear goal.
See `CODEMAGIC_SETUP.md` for detailed step-by-step instructions on any item.

---

## 1 — Google Play Console setup

- [ ] Google Play Console account created at **play.google.com/console** ($25 one-time)
- [ ] TwinTrack app created in Play Console
  - App name: TwinTrack
  - Bundle ID (package name): `com.allaboutwins.twintrack`
  - Category: Health & Fitness (or Parenting)
  - Free app

---

## 2 — Android signing (keystore)

- [ ] Keystore generated inside Codemagic → **Code signing identities → Android → Generate keystore**
  - Key alias: `twintrack`
  - Validity: 25 years
- [ ] Keystore **backed up** — download the `.jks` from Codemagic and store it somewhere safe
  - ⚠️ If you lose this file, you can never update TwinTrack on Google Play

---

## 3 — Google Play service account (for automated uploads)

- [ ] Google Cloud project created at **console.cloud.google.com**
- [ ] **Google Play Android Developer API** enabled in that project
- [ ] Service account created (`codemagic-play-upload`)
- [ ] Service account JSON key downloaded
- [ ] Service account linked in Play Console → **Setup → API access → Grant access**
  - Role: **Release manager**

---

## 4 — Codemagic environment variables

Set these in Codemagic → your TwinTrack app → **Environment variables** (mark secrets as Secret):

| Variable | Value | Secret |
|---|---|---|
| `CM_KEYSTORE` | Base64 string from Codemagic keystore generator | ✅ |
| `CM_KEYSTORE_PASSWORD` | Password you chose when generating the keystore | ✅ |
| `CM_KEY_ALIAS` | `twintrack` | |
| `CM_KEY_PASSWORD` | Key password you chose | ✅ |
| `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | Full JSON contents of the service account key file | ✅ |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys → `pk_live_...` (not pk_test) | ✅ |
| `VITE_REVENUECAT_ANDROID_API_KEY` | RevenueCat → your project → API Keys → Android public key (`goog_...`) | ✅ |
| `VITE_PREMIUM_ENABLED` | `false` — keep subscriptions off for launch | |

**Do NOT add `VITE_CLERK_PROXY_URL`** — leave it completely absent for native builds.

---

## 5 — Trigger the first build

- [ ] Push all code to the **main** branch on GitHub
- [ ] In Codemagic → Start new build → branch `main` → workflow **"TwinTrack Android — Google Play"**
- [ ] Build completes (~20 minutes) — download the `.aab` file from build artifacts

---

## 6 — First manual upload to Google Play (required once)

Google Play requires one manual upload before automated uploads can start.

- [ ] In Play Console → your app → **Internal testing → Create new release**
- [ ] Upload the `.aab` file you downloaded from step 5
- [ ] Add release notes (e.g. "First internal build for testing")
- [ ] **Save → Review release → Start rollout to Internal testing**

After this, every future Codemagic build uploads automatically. ✅

---

## 7 — Add yourself as an internal tester

- [ ] Play Console → your app → **Internal testing → Testers tab**
- [ ] Create an email list, add your own Gmail address
- [ ] Open the **opt-in link** on your Android device → accept → install TwinTrack from Play Store

---

## 8 — Test on your Android device (before going to production)

Work through these on a real Android phone:

**Auth**
- [ ] Sign up with email — creates account, onboarding appears
- [ ] Sign out and sign back in — lands on dashboard
- [ ] Sign in with Google — OAuth flow completes and returns to app

**Core features**
- [ ] Dashboard loads — shows both twins' today summary
- [ ] Sleep: start a nap timer → stop it → entry appears in today's list
- [ ] Feeding: log a bottle → appears in today's count
- [ ] Diapers: tap Wet → confirmation animation plays
- [ ] Routines: check off a morning item → progress bar updates
- [ ] Settings: rename Twin A and Twin B — names persist after restart

**App polish**
- [ ] App icon shows correctly on home screen
- [ ] Splash screen appears and hides cleanly
- [ ] Back button behaviour feels natural throughout the app
- [ ] No crash on any screen (check crash logs in Play Console)

---

## 9 — Minimum store listing (required for production submission)

- [ ] **App icon** — 512×512 PNG, no rounded corners (Play Store applies them)
- [ ] **Short description** — ≤ 80 characters (e.g. "Track sleep, feeds & diapers for both twins at once")
- [ ] **Full description** — ≤ 4000 characters
- [ ] **Screenshots** — at least 2 phone screenshots (1080×1920 recommended)
- [ ] **Privacy policy URL** — point to your deployed TwinTrack `/privacy` page
- [ ] **Content rating** — complete the questionnaire in Play Console (takes 5 min)

---

## 10 — Go to production

When internal testing passes and the store listing is complete:

- [ ] Play Console → **Production → Create new release**
- [ ] Select the internal build you tested
- [ ] Write release notes ("TwinTrack is now available for twin parents!")
- [ ] **Submit for review** — Google typically reviews in a few hours to 1-2 days
- [ ] Monitor Play Console for any policy rejection emails

---

## Ongoing — every code update

1. Push to `main` on GitHub
2. Codemagic builds and uploads to internal testing automatically
3. Test on device → promote to production in Play Console when ready

---

## Quick reference

| Item | Value |
|---|---|
| Bundle ID | `com.allaboutwins.twintrack` |
| Codemagic workflow | `android-google-play` |
| Build instance | `linux_x2` (no Mac needed) |
| Output | Signed `.aab` (Android App Bundle) |
| Upload track | Internal testing (auto) |
| Java version | 17 |
| Node version | 20.19.2 |
| Subscriptions | Disabled for launch (`VITE_PREMIUM_ENABLED=false`) |
