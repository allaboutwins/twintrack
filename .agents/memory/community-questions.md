---
name: Community Questions
description: Community Q&A system — DB schema, API, Learn.tsx integration
---

## DB schema (lib/db/src/schema/community-questions.ts)
- `community_questions` — userId, question, authorName, status (pending/published/rejected), isAdminAdded, pinnedAnswerId
- `community_answers` — questionId, userId, authorName, answerText, likes, isPinned
- `community_answer_likes` — answerId, userId (for toggle-like pattern)

## API routes (artifacts/api-server/src/routes/community.ts)
- GET /community/questions — published questions with answers (sorted pinned first, then by likes)
- GET /community/questions/latest — single newest published question, no answers (lightweight, used by Home dashboard widget)
- POST /community/questions — submit (goes to pending, needs admin approval)
- POST /community/questions/:id/answers — submit answer
- POST /community/answers/:id/like — toggle like (checks community_answer_likes for dedup)
- Admin: GET/POST /admin/community/questions, PATCH /admin/community/questions/:id, PATCH /admin/community/answers/:id/pin
- Not in OpenAPI spec — frontend calls these via raw `fetch("/api/community/...")`, not generated Orval hooks. Keep new community endpoints consistent with this (don't half-migrate to codegen).

## Frontend (Learn.tsx CommunityQuestionsSection)
Lives in Community tab above Polls. Collapsible question cards, expandable answers with like buttons, answer input at bottom of expanded card. "Ask a question" form with submit → thank-you message using the "Based on feedback from TwinTrack families" framing.

**Why:** Moms requested peer Q&A. Questions require admin approval before publishing to prevent spam. Admin can also inject questions received via social media (isAdminAdded flag).

**How to apply:** Admin reviews pending questions via GET /admin/community/questions, approves with PATCH status=published. Pin best answers with PATCH /admin/community/answers/:id/pin.
