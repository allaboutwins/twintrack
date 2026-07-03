---
name: Dashboard duplicate widget bug pattern
description: Root cause of the "cherries" notification persistence bug on TwinTrack Dashboard
---

Two separate components fed by the same API endpoint but each with their own localStorage dismissal key will appear to "un-dismiss" each other from the user's perspective, even though each one's own persistence logic works correctly in isolation.

**Why:** it's easy to reintroduce a feature (e.g. "what's new" banner) as a new component without noticing an existing one already renders the same data elsewhere in the page.

**How to apply:** before adding a new dismissible/notification widget, grep the page for existing usages of the same API endpoint or similar dismissal-key naming patterns (e.g. `tt_dismissed_*`, `tt_*_seen`) to avoid shipping a duplicate.
