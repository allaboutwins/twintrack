---
name: RevenueCat setup
description: RevenueCat v2 API integration details, gotchas, and env var checklist for TwinTrack.
---

## Key facts

- **v2 secret key required** — the v1 legacy key (`sk_Cy...`) returns "legacy API key" error on v2. A new v2 key must be created in the RevenueCat dashboard under Project → API Keys.
- **test_store app type is NOT valid in v2 API** — the seed script originally tried to create a test_store app; this fails with a parameter error. Only `app_store` and `play_store` are valid.
- **v2 keys are project-scoped** — `listProjects` works but `createProject` returns auth error if the key belongs to an existing project. Seed script now falls back to using the first listed project if none named "TwinTrack".
- **Replit secrets are NOT injected into bash** — running `pnpm run seed-revenuecat` from bash won't see updated secrets until workflows restart. Pass the key explicitly as `REVENUECAT_SECRET_KEY=... tsx ...` when running seed manually.

## Env vars set

- `REVENUECAT_PROJECT_ID` = proj09a461ed
- `REVENUECAT_APPLE_APP_STORE_APP_ID` = app926b0abdbc
- `REVENUECAT_GOOGLE_PLAY_STORE_APP_ID` = apped48b563ab
- `VITE_REVENUECAT_IOS_API_KEY` = appl_spJzpJipDcGAVtiRGqTjXFWUEzq
- `VITE_REVENUECAT_ANDROID_API_KEY` = goog_cWFQbvEiYwoYmMCRpuDHlKrZFku
- `VITE_PREMIUM_ENABLED` = false (flip to true to go live)

## What the seed script created

- 2 apps: TwinTrack iOS (app_store, bundle: com.allaboutwins.twintrack), TwinTrack Android (play_store, package: com.allaboutwins.twintrack)
- 3 products × 2 stores = 6 products: founding_annual ($39/yr), premium_annual ($49/yr), premium_monthly ($5.99/mo)
- 1 entitlement: `premium`
- 1 offering: `founding_moms` (set as current/default)
- 3 packages: `founding_annual`, `$rc_annual`, `$rc_monthly`

**Why:** v2 API differences caused multiple failures during initial setup; these rules prevent re-running into them.
