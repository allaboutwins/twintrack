---
name: PWA install prompt disabled
description: InstallPrompt component disabled — native app stores are primary install path
---

InstallPrompt.tsx now returns `null` immediately. The file and its import in Layout.tsx are kept to avoid breaking the import chain.

**Why:** The "Add to Home Screen" PWA prompt was causing login/update issues (likely due to cached service workers). The app is being prepared for App Store and Google Play — the native app experience is the intended install path.

**How to apply:** Do NOT re-enable InstallPrompt without confirming App Store/Play submission status. If re-enabling, also check useInstallPrompt.ts hook for snoozed/dismissed localStorage keys (tt_install_dismissed, tt_install_snoozed_until).
