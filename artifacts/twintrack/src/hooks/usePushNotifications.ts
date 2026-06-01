import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { isNativePlatform } from "@/lib/native";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Native (Capacitor) push ───────────────────────────────────────────────

async function loadCapacitorPush() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return PushNotifications;
  } catch {
    return null;
  }
}

// ── Web push helpers ──────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const { user } = useUser();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) {
      // On native, check current Capacitor push permission state
      loadCapacitorPush().then((Push) => {
        if (!Push) { setPermission("unsupported"); return; }
        Push.checkPermissions().then((status) => {
          if (status.receive === "granted") setPermission("granted");
          else if (status.receive === "denied") setPermission("denied");
          else setPermission("default");
        }).catch(() => setPermission("unsupported"));
      });
      return;
    }

    // Web path
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      });
    });
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    setLoading(true);

    try {
      // ── Native path ──────────────────────────────────────────────────
      if (isNativePlatform()) {
        const Push = await loadCapacitorPush();
        if (!Push) return false;

        const { receive } = await Push.requestPermissions();
        if (receive !== "granted") {
          setPermission("denied");
          return false;
        }
        setPermission("granted");

        // Register for push — the FCM/APNs token arrives via 'registration' listener
        await Push.register();

        // Listen for FCM/APNs token and register it server-side
        const listener = await Push.addListener("registration", async (token) => {
          await fetch(`${BASE_URL}/api/push/native-subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: token.value,
              userId: user.id,
              platform: (window as unknown as { Capacitor?: { getPlatform?: () => string } })
                .Capacitor?.getPlatform?.() ?? "unknown",
            }),
          }).catch(() => {});
          listener.remove();
        });

        return true;
      }

      // ── Web path ─────────────────────────────────────────────────────
      if (!("serviceWorker" in navigator)) return false;

      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return false;

      const vapidRes = await fetch(`${BASE_URL}/api/push/vapid-public-key`);
      const { publicKey } = await vapidRes.json() as { publicKey: string };

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });

      await fetch(`${BASE_URL}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
            auth: arrayBufferToBase64(sub.getKey("auth")!),
          },
          userAgent: navigator.userAgent,
        }),
      });

      setSubscription(sub);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      if (isNativePlatform()) {
        // For native, there's no simple "unsubscribe" — would need to deregister token server-side
        // For now, just update UI state
        setPermission("default");
        return;
      }
      if (!subscription) return;
      await fetch(`${BASE_URL}/api/push/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  const sendTest = useCallback(async (): Promise<void> => {
    await fetch(`${BASE_URL}/api/push/send-test`, { method: "POST" });
  }, []);

  return { permission, subscription, loading, subscribe, unsubscribe, sendTest };
}
