import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT is only needed for the dev/preview server — not for production builds.
// Fall back to 19107 so `vite build` works without the env var.
const rawPort = process.env.PORT;
const port = rawPort && !Number.isNaN(Number(rawPort)) ? Number(rawPort) : 19107;

// BASE_PATH defaults to "/" when not set (e.g. during static production builds).
const basePath = process.env.BASE_PATH ?? "/";

const scope = basePath === "/" ? "/" : basePath + "/";
const startUrl = basePath + "/dashboard";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "logo.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "TwinTrack",
        short_name: "TwinTrack",
        description: "The twin parenting app that finally understands twin life",
        theme_color: "#da5a9f",
        background_color: "#fdf8fa",
        display: "standalone",
        orientation: "portrait",
        scope,
        start_url: startUrl,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
      },
      workbox: {
        // skipWaiting: new SW activates immediately for brand-new sessions.
        // clientsClaim is intentionally OMITTED — it would take over existing
        // tabs mid-session and invalidate their loaded JS chunks, causing blank
        // screens after every deploy. Existing tabs keep their old SW until
        // they close and reopen, at which point they get the new version cleanly.
        skipWaiting: true,
        cleanupOutdatedCaches: true,

        // For SPA routes (/dashboard, /sleep, etc.) serve the cached app shell
        // so the React app loads and handles routing — not the offline page.
        // offline.html is only shown by the OfflineBanner inside the React app.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/__/, /\/offline\.html$/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        importScripts: ["sw-push.js"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-static",
              expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
            },
          },
          {
            urlPattern: /\/api\/dashboard/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "api-dashboard",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 },
            },
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
