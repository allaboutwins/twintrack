import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function usePushNotifications() {
  const { user } = useUser();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    if (!user?.id || !("serviceWorker" in navigator)) return false;
    setLoading(true);
    try {
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
    if (!subscription) return;
    setLoading(true);
    try {
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
