# TwinTrack

An all-in-one life management app for parents of twins — track sleep, feeding, diapers, and routines for both twins simultaneously.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/twintrack run dev` — run the frontend (mobile-first React app)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS v4 + Quicksand font
- Auth: Clerk (email/social)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-spec/orval.config.ts` — Orval config (single-mode Zod, do NOT change to split mode)
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas (do NOT edit manually)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks (do NOT edit manually)
- `lib/db/src/schema/` — Drizzle ORM table definitions (twins, sleep, feeding, diapers, routines, videos)
- `artifacts/api-server/src/routes/` — Express route handlers (twins, sleep, feeding, diapers, routines, videos, dashboard)
- `artifacts/twintrack/src/pages/` — React pages (Landing, Dashboard, Sleep, Feeding, Diapers, Routines, TwinsTV, Settings)
- `artifacts/twintrack/src/components/Layout.tsx` — Bottom nav, TwinTabs, PageHeader shared components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → Zod schemas + React Query hooks used everywhere
- Orval uses `mode: "single"` for Zod output to avoid duplicate export TS errors — do NOT switch to split mode
- Clerk auth is proxied through the API server using `clerkProxyMiddleware` so the same domain handles auth
- Twin profiles store `label` ("Twin A"/"Twin B") + user-chosen `name`, enabling flexible renaming
- All tracker pages (sleep/feeding/diapers) filter by `twinId + date` — data is per-twin, per-day

## Product

- **Landing** — Beautiful intro for signed-out users with brand story, CTAs for sign-up and sign-in
- **Dashboard** — Today's snapshot for both twins (sleep hours, feeding count, diaper count + active sleep timer)
- **Sleep Tracker** — Start/stop nap/night timer per twin, manual entries, daily summary (total, naps, night sleep)
- **Feeding Tracker** — One-tap logging for breast/bottle/formula/solids with daily totals per twin
- **Diaper Tracker** — Big thumb-friendly Wet/Dirty/Mixed buttons with satisfying confirmation animation
- **Routines** — Categorized checklists (Morning/Bedtime/Outing/Daycare/Meal) with progress bars and favorites
- **Twins TV** — Curated YouTube video library with category filters, search, bookmarking, and embedded player
- **Settings** — Twin A & Twin B profile editor (name, gender, birthdate, color theme), sign out

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use individual artifact workflows
- Orval config: `mode: "single"` for zod output — revert will cause duplicate export TS errors
- `lib/api-zod/src/index.ts` must only re-export from `./generated/api` (orval single mode does not regenerate it)
- After changing DB schema, run `pnpm --filter @workspace/db run push` then restart API server workflow
- After changing OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` before using new hooks

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk integration details
