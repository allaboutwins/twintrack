---
name: Learn Tab Videos Removed
description: Videos (library/saved) tabs were removed from Learn.tsx in a cleanup pass
---

## What changed

- Removed imports: `useListVideos`, `useListBookmarkedVideos`, `useBookmarkVideo`, `useListVideoNotes`, `useUpsertVideoNote` and related query key helpers
- Removed lucide icons: `Bookmark`, `BookmarkCheck`, `Play`, `Search`, `StickyNote`
- Removed helper functions: `getYouTubeId`, `getEmbedUrl`, `isYouTubeShorts`, `getThumbnail`, `VideoNotePanel`
- Removed CATEGORIES constant
- Tab array now has only 3 entries: `magazines`, `academy`, `community`
- `activeTab` type is now `"magazines" | "academy" | "community"` (not library/saved)

**Why:** Learn tab was overloaded. Videos section was deprioritized to surface the highest-value content (magazines, academy, community/polls).

## Remaining

Community tab still has polls, tip of the day, "you're doing amazing" card, and social links.
Academy tab still has curated article cards + feedback widget.
Magazines tab still has the full magazine grid.
