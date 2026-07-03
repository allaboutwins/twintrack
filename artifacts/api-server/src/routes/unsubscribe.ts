import { Router } from "express";
import { createHmac } from "crypto";
import { db, emailUnsubscribesTable } from "@workspace/db";

const router = Router();

export function getUnsubToken(email: string): string {
  const secret = process.env.SESSION_SECRET ?? "twintrack-unsub-fallback";
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 32);
}

router.get("/unsubscribe", async (req, res): Promise<void> => {
  const { email, token } = req.query as { email?: string; token?: string };

  if (!email || !token || token !== getUnsubToken(email)) {
    res.status(400).send(buildPage("Invalid unsubscribe link.", false, ""));
    return;
  }

  try {
    await db
      .insert(emailUnsubscribesTable)
      .values({ email: email.toLowerCase(), source: "link" })
      .onConflictDoNothing();
    res.send(buildPage("You've been unsubscribed.", true, email));
  } catch {
    res.status(500).send(buildPage("Something went wrong. Please try again.", false, ""));
  }
});

function buildPage(message: string, success: boolean, email: string): string {
  const icon = success ? "💕" : "⚠️";
  const color = success ? "#c084fc" : "#f87171";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TwinTrack — Unsubscribe</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #fdf4ff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: white; border-radius: 24px; padding: 48px 40px; max-width: 440px;
            width: 100%; text-align: center; box-shadow: 0 4px 32px rgba(192,132,252,0.12); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 10px; }
    p { font-size: 15px; color: #6b7280; line-height: 1.6; margin-bottom: 24px; }
    a { display: inline-block; background: ${color}; color: white; text-decoration: none;
        font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 99px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>TwinTrack</h1>
    ${success
      ? `<p>${email ? `<strong>${email}</strong> has been` : "You've been"} removed from our mailing list. You won't receive any more campaign emails from us.</p>`
      : `<p>${message}</p>`}
    <a href="https://app.allaboutwins.com">Return to TwinTrack</a>
  </div>
</body>
</html>`;
}

export default router;
