import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";

export interface NotificationPrefs {
  feedingReminders: boolean;
  sleepReminders: boolean;
  pumpingReminders: boolean;
  medicationReminders: boolean;
  milestoneReminders: boolean;
  twinAiTips: boolean;
  weeklyInsights: boolean;
  dailyLogReminder: boolean;
  feedingIntervalMinutes: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  feedingReminders: true,
  sleepReminders: true,
  pumpingReminders: false,
  medicationReminders: false,
  milestoneReminders: true,
  twinAiTips: true,
  weeklyInsights: true,
  dailyLogReminder: true,
  feedingIntervalMinutes: 180,
};

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function useNotificationPrefs() {
  const { user } = useUser();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/notification-prefs`);
      if (res.ok) setPrefs(await res.json() as NotificationPrefs);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  const save = useCallback(async (updates: Partial<NotificationPrefs>) => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/notification-prefs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) setPrefs(await res.json() as NotificationPrefs);
    } finally {
      setSaving(false);
    }
  }, []);

  const toggle = useCallback((key: keyof Omit<NotificationPrefs, "feedingIntervalMinutes">) => {
    const newVal = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: newVal }));
    void save({ [key]: newVal });
  }, [prefs, save]);

  return { prefs, loading, saving, toggle, save };
}
