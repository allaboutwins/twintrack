---
name: Page transitions
description: How to implement route transitions in TwinTrack without crashes
---

Using framer-motion's AnimatePresence at the Switch/Router level causes an invalid hook call crash in the Toaster component during React tree teardown (resolveDispatcher null). The root cause is that AnimatePresence mode="wait" unmounts/remounts subtrees before the Toaster's useToast hook can stabilise.

**Rule:** Use a plain CSS opacity+transform approach via useRef+useState instead of AnimatePresence for route-level transitions.

**How to apply:** See `artifacts/twintrack/src/components/PageTransition.tsx` — tracks previous location with useRef, briefly sets visible=false on route change, applies CSS transition via inline styles. Toaster stays outside PageTransition wrapper and is never affected.

**Why:** Framer AnimatePresence mode="wait" unmounts the old tree before mounting the new one; any hook-using component rendered at the same level (Toaster) crashes because React's dispatcher is torn down mid-render.
