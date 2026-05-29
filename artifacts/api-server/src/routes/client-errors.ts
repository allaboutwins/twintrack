import { Router } from "express";

const router = Router();

/**
 * Public endpoint — no auth required.
 * Accepts frontend crash reports (window.onerror, unhandledrejection,
 * AppErrorBoundary) and logs them to the structured server log so they appear
 * in production deployment logs alongside API errors.
 */
router.post("/client-errors", (req, res) => {
  const b = req.body ?? {};
  req.log.error(
    {
      clientError: {
        type:    String(b.type    ?? "unknown").slice(0, 60),
        message: String(b.message ?? "").slice(0, 500),
        stack:   String(b.stack   ?? "").slice(0, 3000),
        url:     String(b.url     ?? "").slice(0, 300),
        ua:      String(b.userAgent ?? "").slice(0, 500),
        userId:  String(b.userId  ?? "").slice(0, 100),
        context: String(b.context ?? "").slice(0, 500),
        clientTs: b.ts ?? null,
      },
    },
    "client_error",
  );
  res.status(204).end();
});

export default router;
