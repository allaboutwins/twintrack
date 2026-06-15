import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Security headers ─────────────────────────────────────────────────────────
// These prevent clickjacking, MIME-sniffing, and info leakage.
// Applied before every response so browsers and network proxies treat the
// site as secure even when accessed via in-app browsers or corporate proxies.
app.use((_req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Allow framing only from same origin (lets Clerk auth iframes work)
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Stop legacy IE from running downloads in the page context
  res.setHeader("X-Download-Options", "noopen");
  // Only send origin on cross-origin requests, never full URL
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Lock down device APIs we don't use
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  // Disable the broken XSS-auditor (modern recommendation)
  res.setHeader("X-XSS-Protection", "0");
  // Enforce HTTPS in production for 1 year
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Build the list of authorized parties from production domains so Clerk can
// validate the `azp` claim in session tokens and suppress the missing-claim
// warnings that appear when production domains aren't registered.
function getAuthorizedParties(): string[] {
  const parties: string[] = [];
  // Replit sets REPLIT_DOMAINS as a comma-separated list of the app's public domains
  const replitDomains = process.env.REPLIT_DOMAINS ?? "";
  for (const d of replitDomains.split(",")) {
    const trimmed = d.trim();
    if (trimmed) parties.push(`https://${trimmed}`);
  }
  // Also accept localhost, dev origins, and the Capacitor native origin
  parties.push(
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:19107",
    "capacitor://localhost",   // Android + iOS Capacitor WebView
  );
  return parties;
}

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
    authorizedParties: getAuthorizedParties(),
  })),
);

// Prevent browsers, CDN, and proxies from caching ANY API response.
// Without this, Replit's production proxy caches GET responses for hours/days,
// causing the Admin panel and all live data to show stale results.
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

app.use("/api", router);

export default app;
