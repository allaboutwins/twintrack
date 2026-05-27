import { useState } from "react";

export interface AppPrefs {
  showTwinAI: boolean;
}

const DEFAULT_PREFS: AppPrefs = {
  showTwinAI: true,
};

const STORAGE_KEY = "tt_app_prefs_v1";

function load(): AppPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AppPrefs>) };
  } catch {}
  return DEFAULT_PREFS;
}

function persist(prefs: AppPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useAppPrefs() {
  const [prefs, setPrefs] = useState<AppPrefs>(load);

  function toggle(key: keyof AppPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persist(next);
      return next;
    });
  }

  return { prefs, toggle };
}
