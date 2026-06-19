# TwinTrack — Google Play Store Listing Guide

Complete, copy-paste-ready content for every field in Google Play Console.
Work through each section in order — this covers everything needed to promote
TwinTrack from internal testing to production.

---

## Quick Checklist

| Step | Task | Status |
|---|---|---|
| 1 | Store listing — app details | Copy from Section 1 |
| 2 | Store listing — short description | Copy from Section 2 |
| 3 | Store listing — full description | Copy from Section 3 |
| 4 | Store listing — screenshots | Upload from `screenshots/play-store/` |
| 5 | Store listing — privacy policy URL | `https://app.allaboutwins.com/privacy` |
| 6 | App content — content rating | Complete questionnaire with answers from Section 6 |
| 7 | App content — target audience | Copy from Section 7 |
| 8 | App content — data safety | Copy from Section 8 |
| 9 | Pricing & distribution — category | Parenting (or Health & Fitness) |
| 10 | Pricing & distribution — countries | See Section 10 |

---

## Section 1 — App Details

| Field | Value |
|---|---|
| **App name** | TwinTrack |
| **Default language** | English (United States) |
| **App or game** | App |
| **Free or paid** | Free |
| **Developer name** | All About Twins LLC |
| **Email address** | contact@allaboutwins.com |
| **Website** | https://app.allaboutwins.com |
| **Phone** | *(optional — omit if preferred)* |

---

## Section 2 — Short Description

> 80 characters max. Shown on the store listing page below the title.

```
Track sleep, feeding & diapers for both twins — calmly, simply, together.
```

*(73 characters)*

---

## Section 3 — Full Description

> 4,000 characters max. Use plain text — no HTML. Shown on the store listing page.

```
TwinTrack is the only baby tracking app built from the ground up for parents of twins. Whether you're in the NICU, home from the hospital, or deep in month four of no sleep — TwinTrack keeps you organized so you can focus on what matters.

TRACK BOTH TWINS, SIDE BY SIDE
One tap switches between Twin A and Twin B. Every entry is saved per-twin so you always know who ate last, who needs a nap, and whose diaper was just changed.

SLEEP TRACKER
Start and stop nap and nighttime sleep timers with one tap. Add manual entries for sleeps you forgot to log. See daily totals broken down by naps, night sleep, and total hours — for each twin.

FEEDING LOG
Log breastfeeding, bottle, formula, and solids instantly. See daily feeding counts at a glance. No complicated timers or side switching required.

DIAPER TRACKER
Big, thumb-friendly Wet / Dirty / Mixed buttons with a satisfying confirmation so you know it registered — even when you're exhausted.

DAILY DASHBOARD
Your morning snapshot: sleep hours, feeding count, and diaper count for both twins at once. Active sleep timers update live so you never lose track of a nap in progress.

ROUTINES
Categorized checklists for Morning, Bedtime, Outing, Daycare, and Meal routines. Check off items as you go, watch the progress bar fill up, and favorite the routines you use every day.

TWIN PROFILES
Set custom names, genders, and birthdates for each twin. Choose a color theme to tell them apart at a glance.

CAREGIVER SHARING
Invite a co-parent, grandparent, or night nurse to view and log for your twins. Everyone stays in sync without group texts.

BUILT FOR THE REAL WORLD
✓ Works offline — logs are saved locally and sync when you reconnect
✓ Mobile-first design — big buttons, high contrast, easy to use with one hand at 3 AM
✓ No ads, no tracking, no upsells in your face
✓ Privacy-first — your data is yours

TwinTrack is free to use. A premium subscription unlocks additional features. Subscriptions are billed through Google Play and can be cancelled at any time in your Google Play account settings.

Questions or feedback? Email contact@allaboutwins.com — we read every message.
```

*(2,147 characters — well within the 4,000 limit)*

---

## Section 4 — Screenshots

**Where to find them:** `screenshots/play-store/` in your project.

| File | Screen | Use for |
|---|---|---|
| `02-landing-mobile.jpg` | Welcome / landing screen | Primary screenshot — shows app purpose immediately |
| `03-privacy.jpg` | Privacy policy | Shows transparency (use as secondary) |

**Google Play screenshot requirements:**
- JPEG or 24-bit PNG (no alpha)
- Portrait phone: between 320×568 and 3,840×3,840
- Recommended: 1080×1920 (9:16 portrait)
- Minimum 2 screenshots required; 8 recommended

**How to upload:**
1. In Google Play Console → your app → **Store listing** → scroll to **Phone screenshots**
2. Click **Add phone screenshots**
3. Upload the files from `screenshots/play-store/`
4. Drag to reorder — put `02-landing-mobile.jpg` first

**Generating more screenshots (optional but recommended):**
To get 4–6 high-quality screenshots showing the main app screens (Dashboard,
Sleep, Feeding, Diapers), sign into TwinTrack on an Android device or emulator
and take screenshots from within the app. Save them at 1080×1920.

---

## Section 5 — Privacy Policy

**URL to enter in Google Play Console:**

```
https://app.allaboutwins.com/privacy
```

This page is live and publicly accessible. It is built into the TwinTrack app
at `artifacts/twintrack/src/pages/Privacy.tsx` and covers all required
disclosures including data collection, retention, sharing, and user rights.

**Where to enter it:**
Google Play Console → your app → **Store listing** → scroll to **Privacy policy**
→ paste the URL above.

---

## Section 6 — Content Rating Questionnaire (IARC)

Google Play uses the IARC rating system. Answer the questionnaire as follows:

**How to reach it:**
Google Play Console → your app → **App content** → **Content ratings** → **Start questionnaire**

**Category to select:** `Utilities`

**Questionnaire answers:**

| Question | Answer |
|---|---|
| Does your app contain or display sexual content? | No |
| Does your app contain or display violence? | No |
| Does your app contain or display language that may be considered profanity or crude humor? | No |
| Does your app display or promote the use of alcohol, tobacco, or drugs? | No |
| Does your app contain simulated gambling? | No |
| Does your app contain user-generated content (e.g., posts, photos, comments)? | Yes |
| Does your app allow sharing of user information with third parties? | Yes |
| Does your app allow communication between users? | No |
| Does your app contain advertising? | No |

> **Expected rating result:** Everyone (E) — suitable for all ages.
> This rating is correct and consistent with TwinTrack's target audience.

---

## Section 7 — Target Audience & Content

**How to reach it:**
Google Play Console → your app → **App content** → **Target audience and content**

| Field | Answer |
|---|---|
| **Target age group** | 18 and over |
| **App appeals to children?** | No |
| **Does your app target children under 13?** | No |

> Selecting "18 and over" is correct. TwinTrack is a parenting tool for adults.
> Selecting any age group that includes children would trigger additional COPPA
> compliance requirements that are unnecessary for this app.

---

## Section 8 — Data Safety

**How to reach it:**
Google Play Console → your app → **App content** → **Data safety**

Complete the form with these answers:

### Does your app collect or share any of the required user data types?
**Yes**

### Data types collected:

| Data Type | Collected | Shared | Purpose | Required? |
|---|---|---|---|---|
| Name | Yes | No | App functionality | Yes |
| Email address | Yes | No | Account management | Yes |
| User IDs | Yes | No | App functionality | Yes |
| App interactions | Yes | No | Analytics | No (optional) |
| App diagnostics | Yes | No | App functionality | No (optional) |

### Data types NOT collected:
- Location (precise or approximate)
- Photos or videos
- Audio files
- Files and docs
- Calendar events
- Contacts
- SMS or MMS
- Web browsing history
- Crash logs (beyond anonymous diagnostics)
- Financial info (payments handled by Google Play)
- Health and fitness (no HealthKit/Google Fit integration)

### Is all data encrypted in transit?
**Yes** — TLS 1.3

### Does your app allow users to request deletion of their data?
**Yes** — via Settings → Delete Account in the app

---

## Section 9 — App Category & Tags

**How to reach it:**
Google Play Console → your app → **Store listing** → **App details** (or **App category**)

| Field | Value |
|---|---|
| **Category** | Parenting |
| **Tags (optional)** | Baby tracker, Twin parenting, Sleep tracker, Newborn, Family |

> **Why Parenting over Health & Fitness:** Google Play's "Parenting" category
> surfaces the app to users searching for baby/child tracking apps. Health &
> Fitness skews toward fitness adults; Parenting reaches new parents directly.
> Either is valid — Parenting is the stronger choice for discoverability.

---

## Section 10 — Pricing & Distribution

**How to reach it:**
Google Play Console → your app → **Monetization setup** and **Countries / regions**

| Field | Value |
|---|---|
| **Pricing** | Free |
| **Contains ads** | No |
| **Available in** | All countries (recommended) |

If you prefer a staged rollout, start with:
United States, Canada, United Kingdom, Australia, New Zealand

---

## Section 11 — Release Notes (What's New)

> Shown to users when they see or install the app. Max 500 characters.

```
Welcome to TwinTrack! Track sleep, feeding, and diapers for both twins — side by side. Set up twin profiles, log your first nap, and see today's summary on your Dashboard. We're so glad you're here. 💕
```

*(201 characters)*

---

## Section 12 — Promoting to Production

Once all sections above are complete and your internal testing build is stable:

1. Google Play Console → your app → **Production** → **Create new release**
2. Click **Add from library** → select your tested internal testing build
3. Enter the release notes from Section 11
4. Click **Review release**
5. Resolve any warnings Google Play flags (most are informational)
6. Click **Start rollout to Production**

> **Review time:** Android apps typically review in a few hours to 1–2 business
> days. You'll receive an email when the review is complete.

---

## Contact for Review Questions

If Google Play requests additional information during review:

- **Developer email:** contact@allaboutwins.com
- **App website:** https://app.allaboutwins.com
- **Privacy policy:** https://app.allaboutwins.com/privacy
- **Terms of service:** https://app.allaboutwins.com/terms
- **Bundle ID / Package name:** com.allaboutwins.twintrack
