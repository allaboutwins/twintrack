import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";

const INTERVAL_MS = 60_000;
const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export default function HeartbeatReporter() {
  const { user } = useUser();
  const [location] = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    function send() {
      fetch(`${BASE_URL}/api/heartbeat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, page: locationRef.current }),
        keepalive: true,
      }).catch(() => {});
    }

    send();
    const timer = setInterval(send, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user?.id]);

  return null;
}
