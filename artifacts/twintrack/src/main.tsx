import "./lib/posthog";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// On native Capacitor (Android / iOS), relative /api/… URLs resolve to
// capacitor://localhost/api/… which doesn't reach the production server.
// VITE_API_URL is baked into native builds by Codemagic at build time;
// it is intentionally left unset in web builds so relative URLs continue
// to work through the Replit reverse proxy.
const nativeApiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (nativeApiUrl) {
  setBaseUrl(nativeApiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
