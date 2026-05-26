import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 3000);
      return () => clearTimeout(t);
    }
    function handleOffline() {
      setIsOnline(false);
      setJustReconnected(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const visible = !isOnline || justReconnected;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: visible
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 100,
        width: "100%",
        maxWidth: 430,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${
          justReconnected
            ? "bg-emerald-500 text-white"
            : "bg-foreground text-white"
        }`}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        {justReconnected ? (
          <>
            <Wifi size={13} />
            <span>Back online — syncing your data…</span>
          </>
        ) : (
          <>
            <WifiOff size={13} />
            <span>No connection — TwinTrack works offline too 💕</span>
          </>
        )}
      </div>
    </div>
  );
}
