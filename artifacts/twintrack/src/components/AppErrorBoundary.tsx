import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  recovering: boolean;
}

/**
 * Top-level error boundary.
 * Catches any React render error and shows a recovery screen instead of
 * a silent blank page. The recovery button clears all caches and reloads.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in production logs / PostHog if available
    console.error("[AppErrorBoundary]", error, info.componentStack);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).posthog?.capture("app_crash", {
        error: error.message,
        stack: error.stack?.slice(0, 500),
        component: info.componentStack?.slice(0, 500),
      });
    } catch { /* non-fatal */ }
  }

  async recover() {
    this.setState({ recovering: true });
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* non-fatal */ }
    window.location.replace("/");
  }

  render() {
    const { error, recovering } = this.state;
    if (!error) return this.props.children;

    const isChunkError =
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Importing a module script failed");

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fdf8fa",
          padding: "32px 24px",
          fontFamily: "'Quicksand', sans-serif",
          textAlign: "center",
          maxWidth: 430,
          margin: "0 auto",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1 }}>🍒</div>

        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#1a4a50", margin: 0 }}>
            {isChunkError ? "App updated — one tap to reload" : "Something went wrong"}
          </p>
          <p style={{ fontSize: 14, color: "#6b9ea5", marginTop: 8, lineHeight: 1.6 }}>
            {isChunkError
              ? "TwinTrack was just updated in the background. A quick reload will get you in."
              : "TwinTrack hit an unexpected error. Tap below to reload — your data is safe."}
          </p>
        </div>

        <button
          onClick={() => void this.recover()}
          disabled={recovering}
          style={{
            background: "#da5a9f",
            color: "white",
            border: "none",
            borderRadius: 16,
            padding: "14px 32px",
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: recovering ? "not-allowed" : "pointer",
            opacity: recovering ? 0.7 : 1,
            width: "100%",
            maxWidth: 320,
          }}
        >
          {recovering ? "Reloading…" : "Reload TwinTrack 🍒"}
        </button>

        {!isChunkError && (
          <p style={{ fontSize: 11, color: "#6b9ea5", margin: 0 }}>
            Error: {error.message.slice(0, 120)}
          </p>
        )}
      </div>
    );
  }
}
