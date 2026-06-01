---
name: Caregiver system
description: Phase 1 caregiver invite architecture — DB schema, API routes, Settings UI
---

## DB schema (lib/db/src/schema/caregivers.ts)
Table: `caregivers` — ownerId, caregiverEmail, caregiverId (nullable, set on accept), role (Dad/Partner/Grandparent/Nanny/Other), displayName, inviteToken (UUID, unique), status (pending/active/revoked).

## API routes (artifacts/api-server/src/routes/caregivers.ts)
- GET /caregivers?userId — list owner's caregivers
- GET /caregivers/me?userId — returns { ownerId, role } if current user is an active caregiver (for caregiver-aware data routing in future)
- POST /caregivers/invite — creates invite row, returns inviteToken
- POST /caregivers/accept — links caregiverId to token, sets status=active
- DELETE /caregivers/:id — sets status=revoked

## Frontend (Settings.tsx)
Invite section: role pill selector (Dad/Partner/Grandparent/Nanny/Other) + email input + Invite button. Caregiver list shows status (Pending/Active). Pending caregivers show a copy-link button that generates `window.location.origin/invite?token=xxx`.

**Why:** Phase 1 only handles invite+revoke. Phase 2 will use /caregivers/me to detect caregiver sessions and route all API calls to ownerId instead of userId — this requires a CaregiverContext in the frontend or middleware in the API.

**How to apply:** When building caregiver data-sharing, check /caregivers/me on app load and store ownerId in context. Pass ownerId wherever userId is used in tracker APIs.
