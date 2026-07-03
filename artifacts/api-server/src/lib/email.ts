import { Resend } from "resend";

export const SENDER = "TwinTrack <twintrack@allaboutwins.com>";

export interface CaregiverInviteParams {
  to: string;
  parentName: string;
  twinNames: string[];
  role: string;
  inviteLink: string;
}

export interface TrialReminderParams {
  to: string;
  daysLeft: number;
  appUrl: string;
}

export interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: SENDER,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export interface BatchCampaignEntry {
  email: string;
  unsubUrl: string;
}

export interface BatchCampaignResult {
  email: string;
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send campaign announcement emails in batches of 100 (Resend batch API).
 * One API call per 100 recipients — safely under all rate limits.
 */
export async function sendCampaignBatch(
  entries: BatchCampaignEntry[],
  appUrl: string,
): Promise<BatchCampaignResult[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return entries.map(e => ({ email: e.email, ok: false, error: "RESEND_API_KEY not configured" }));
  const resend = new Resend(apiKey);

  const subject = "💕 TwinTrack Just Got Easier - PayPal Is Now Available";
  const results: BatchCampaignResult[] = [];

  const BATCH_SIZE = 100;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const slice = entries.slice(i, i + BATCH_SIZE);
    const payload = slice.map(({ email, unsubUrl }) => ({
      from: SENDER,
      to: email,
      subject,
      html: buildCampaignAnnouncementHtml({ to: email, unsubUrl, appUrl }),
    }));

    const { data, error } = await resend.batch.send(payload);
    if (error) {
      slice.forEach(e => results.push({ email: e.email, ok: false, error: error.message }));
    } else {
      const ids: Array<{ id: string }> = (data as unknown as { data: Array<{ id: string }> })?.data ?? [];
      slice.forEach((e, idx) => results.push({ email: e.email, ok: true, id: ids[idx]?.id }));
    }

    // 600 ms between batches keeps well under 5 req/s
    if (i + BATCH_SIZE < entries.length) await new Promise(r => setTimeout(r, 600));
  }

  return results;
}

export async function sendCaregiverInvite(params: CaregiverInviteParams): Promise<EmailResult> {
  try {
    return await sendEmail({
      to: params.to,
      subject: `${params.parentName} invited you to help with the twins 💕`,
      html: buildCaregiverInviteHtml(params),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendTrialReminderEmail(params: TrialReminderParams): Promise<EmailResult> {
  try {
    const { subject, html } = buildTrialReminderHtml(params);
    return await sendEmail({ to: params.to, subject, html });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Trial reminder email ────────────────────────────────────────────────────

function buildTrialReminderHtml(p: TrialReminderParams): { subject: string; html: string } {
  const year = new Date().getFullYear();

  let subject: string;
  let headlineEmoji: string;
  let headline: string;
  let body: string;
  let urgency: string;

  if (p.daysLeft === 7) {
    subject = "You're officially one of our Founding Twin Moms 💕";
    headlineEmoji = "💕";
    headline = "You're officially one of our<br/>Founding Twin Moms";
    body =
      "You have <strong>7 days left</strong> in your free TwinTrack trial. Unlock Premium now and keep the special <strong>$3.25/month Founding Moms price forever</strong> — before it disappears.";
    urgency = "7 days remaining";
  } else if (p.daysLeft === 3) {
    subject = "Only 3 days left to secure your Founding Moms rate 💕";
    headlineEmoji = "⏳";
    headline = "Only 3 days left to secure<br/>your Founding Moms rate";
    body =
      "Your free trial ends in <strong>3 days</strong>. Lock in your special <strong>$3.25/month Founding Moms rate</strong> now — it stays $3.25/month forever.";
    urgency = "3 days remaining";
  } else if (p.daysLeft === 1) {
    subject = "Your Founding Moms offer ends tomorrow 💕";
    headlineEmoji = "💕";
    headline = "Your Founding Moms offer<br/>ends tomorrow";
    body =
      "Your free trial ends <strong>tomorrow</strong>. We'd love to keep you as a Founding Mom — lock in your <strong>$3.25/month rate</strong> before it slips away.";
    urgency = "Last day · Founding Moms rate";
  } else {
    subject = "Your TwinTrack trial has ended — keep going for $3.25/month 💕";
    headlineEmoji = "💝";
    headline = "Your free trial has ended.<br/>We'd love to keep you.";
    body =
      "Your 14-day TwinTrack trial is over. Your sleep, feeding, and diaper tracking stays — but premium features like Twin AI and the Magazine are now locked. Unlock everything for just <strong>$3.25/month as a Founding Mom</strong>.";
    urgency = "Trial ended · Founding Moms rate still available";
  }

  const benefits = [
    "✨&nbsp; Unlimited Twin AI questions",
    "👨‍👩‍👧‍👦&nbsp; Caregiver access for your whole family",
    "📖&nbsp; Full Twins Magazine library",
    "🎓&nbsp; Twins Academy expert courses",
    "💝&nbsp; Premium memory cards & holiday templates",
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fdf8ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,34,110,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);padding:44px 32px 36px;text-align:center;">
              <div style="margin-bottom:14px;font-size:48px;line-height:1;">${headlineEmoji}</div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">TwinTrack — Founding Moms</p>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.4;">${headline}</h1>
              <div style="margin-top:16px;display:inline-block;background:rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;">
                <p style="margin:0;font-size:12px;font-weight:700;color:#ffffff;">${urgency}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px;">
              <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#374151;">${body}</p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;margin-bottom:28px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">
                      What you unlock with Premium
                    </p>
                    ${benefits.map((f) => `<p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.5;">${f}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
                <tr>
                  <td style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;padding:18px 24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#9c27b0;">💕 Founding Moms Premium</p>
                    <p style="margin:0;font-size:28px;font-weight:800;color:#e91e8c;">Only $3.25/month</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#9c27b0;font-weight:600;">Less than a Starbucks coffee each month ☕</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${p.appUrl}"
                       style="display:inline-block;padding:17px 44px;background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(233,30,140,0.35);">
                      💕 Open TwinTrack
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;font-size:13px;color:#9ca3af;line-height:1.7;text-align:center;">
                After your trial, core tracking (sleep, feeding, diapers, stats) remains free forever.
              </p>

              <hr style="border:none;border-top:1px solid #f3e8ff;margin:0 0 24px;"/>
              <p style="margin:0 0 32px;font-size:13px;color:#9ca3af;line-height:1.7;text-align:center;">
                No pressure, ever. We just want to be the app you can't imagine parenting twins without. 💕
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9f5ff;padding:20px 32px;text-align:center;border-top:1px solid #f3e8ff;">
              <p style="margin:0;font-size:12px;color:#b8a9c9;line-height:1.8;">
                &copy; ${year} TwinTrack &middot; All About Twins<br/>
                <a href="https://allaboutwins.com" style="color:#c084fc;text-decoration:none;">allaboutwins.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ── PayPal announcement email ────────────────────────────────────────────────

export interface PayPalAnnouncementParams {
  to: string;
  trialExtended: boolean;
  newTrialEndDate: string;
  appUrl: string;
}

export type PayPalSubjectVariant = "A" | "B";

export async function sendPayPalAnnouncementEmail(params: PayPalAnnouncementParams, variant: PayPalSubjectVariant = "A"): Promise<EmailResult> {
  const subjects: Record<PayPalSubjectVariant, string> = {
    A: "💕 Your TwinTrack Trial Has Been Extended + PayPal Is Here",
    B: "🎉 Good News: More Time to Try TwinTrack",
  };
  try {
    return await sendEmail({
      to: params.to,
      subject: subjects[variant],
      html: buildPayPalAnnouncementHtml(params),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Broadcast campaign email (CSV-based) ─────────────────────────────────────

export interface CampaignAnnouncementParams {
  to: string;
  unsubUrl: string;
  appUrl: string;
}

export async function sendCampaignAnnouncementEmail(params: CampaignAnnouncementParams): Promise<EmailResult> {
  try {
    return await sendEmail({
      to: params.to,
      subject: "💕 TwinTrack Just Got Easier - PayPal Is Now Available",
      html: buildCampaignAnnouncementHtml(params),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildCampaignAnnouncementHtml(p: CampaignAnnouncementParams): string {
  const year = new Date().getFullYear();
  const features = [
    "🤖&nbsp; <strong>Twin AI</strong> — answers any twin question, any time",
    "👨‍👩‍👧‍👦&nbsp; <strong>Caregiver Access</strong> — share tracking with your whole village",
    "📖&nbsp; <strong>Twins Magazine</strong> — expert articles written for twin parents",
    "🎓&nbsp; <strong>Twins Academy</strong> — on-demand courses for every stage",
    "💝&nbsp; <strong>Memory Cards</strong> — beautiful keepsakes & holiday templates",
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>TwinTrack Just Got Easier 💕</title>
</head>
<body style="margin:0;padding:0;background:#fdf8ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <!-- Preheader: shown in inbox list view before the subject line -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">TwinTrack just got easier. PayPal is now available.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:580px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,34,110,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);padding:48px 32px 40px;text-align:center;">
              <div style="margin-bottom:12px;font-size:52px;line-height:1;">💕</div>
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,0.8);">All About Twins</p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.4;">
                TwinTrack just got easier.<br/>PayPal is now available.
              </h1>
              <p style="margin:16px 0 0;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6;">
                The all-in-one app built for twin parents — now even more accessible.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px 8px;">

              <p style="margin:0 0 28px;font-size:16px;line-height:1.8;color:#374151;">
                Hi there 💕<br/><br/>
                We built TwinTrack for twin parents who are doing twice the work with half the sleep.
                It tracks sleep, feeds, diapers, and routines for <em>both</em> twins at once — and now
                it's easier than ever to get started.
              </p>

              <!-- PayPal badge -->
              <div style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:18px;padding:20px 26px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">
                  💳 PayPal is now available
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
                  You can now subscribe to TwinTrack Premium using your <strong>PayPal account</strong> —
                  fast, familiar, and secure. No new card details required.
                </p>
              </div>

              <!-- Founding Moms pricing -->
              <div style="background:linear-gradient(135deg,#fdf4ff 0%,#fce7f3 100%);border:1.5px solid #f0abfc;border-radius:18px;padding:22px 26px;margin-bottom:28px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">
                  ⏳ Founding Moms pricing — limited time
                </p>
                <p style="margin:0 0 10px;font-size:13px;color:#6b7280;text-decoration:line-through;">$4.08/month regular price</p>
                <p style="margin:0;font-size:36px;font-weight:900;color:#e91e8c;line-height:1.1;">$3.25/month</p>
                <p style="margin:8px 0 0;font-size:13px;color:#9c27b0;font-weight:600;">
                  Billed $39/year · Less than a Starbucks coffee ☕ · Locked in forever
                </p>
              </div>

              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:18px;margin-bottom:30px;">
                <tr>
                  <td style="padding:22px 26px;">
                    <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">
                      What Premium unlocks
                    </p>
                    ${features.map(f => `<p style="margin:0 0 11px;font-size:14px;color:#374151;line-height:1.6;">${f}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#374151;">
                Whether you're a new twin parent or you've been doing this from the start —
                TwinTrack is here for you. <strong>Core tracking is always free.</strong>
                Premium is there when you're ready.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;">
                <tr>
                  <td align="center">
                    <a href="${p.appUrl}"
                       style="display:inline-block;padding:18px 52px;background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(233,30,140,0.35);">
                      💕 Open TwinTrack
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 36px;font-size:13px;color:#b8a9c9;text-align:center;">
                No account yet? <a href="${p.appUrl}" style="color:#c084fc;text-decoration:none;font-weight:600;">Sign up free in 30 seconds</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f5ff;padding:22px 32px;border-top:1px solid #f3e8ff;">
              <p style="margin:0 0 8px;font-size:12px;color:#b8a9c9;text-align:center;line-height:1.8;">
                &copy; ${year} TwinTrack &middot; All About Twins<br/>
                <a href="https://allaboutwins.com" style="color:#c084fc;text-decoration:none;">allaboutwins.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1c4e9;text-align:center;">
                You're receiving this because you signed up for TwinTrack or All About Twins updates.<br/>
                <a href="${p.unsubUrl}" style="color:#c084fc;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── PayPal trial-user announcement email ─────────────────────────────────────

function buildPayPalAnnouncementHtml(p: PayPalAnnouncementParams): string {
  const year = new Date().getFullYear();
  const benefits = [
    "✨&nbsp; Unlimited Twin AI questions",
    "👨‍👩‍👧‍👦&nbsp; Caregiver access for your whole family",
    "📖&nbsp; Full Twins Magazine library",
    "🎓&nbsp; Twins Academy expert courses",
    "💝&nbsp; Premium memory cards & holiday templates",
  ];

  const extensionBlock = p.trialExtended
    ? `<div style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;padding:18px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">Your trial was just extended</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
          As a thank-you for being here from the start, we've added <strong>7 more days</strong> to your free trial.
          Your trial now runs until <strong>${p.newTrialEndDate}</strong> — plenty of time to explore everything TwinTrack has to offer.
        </p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>PayPal is now live on TwinTrack 💕</title>
</head>
<body style="margin:0;padding:0;background:#fdf8ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,34,110,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);padding:44px 32px 36px;text-align:center;">
              <div style="margin-bottom:14px;font-size:48px;line-height:1;">💳</div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">TwinTrack — Founding Moms</p>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.4;">PayPal is now live.<br/>Your trial just got longer.</h1>
              <div style="margin-top:16px;display:inline-block;background:rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;">
                <p style="margin:0;font-size:12px;font-weight:700;color:#ffffff;">Founding Moms · Limited time offer</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px;">
              <p style="margin:0 0 22px;font-size:16px;line-height:1.75;color:#374151;">
                We've been working to make TwinTrack as easy as possible for every twin parent — and today we have two exciting updates for you.
              </p>

              <div style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;padding:18px 24px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">PayPal is now available</p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">
                  You can now subscribe to TwinTrack Premium using your <strong>PayPal account</strong> — fast, familiar, and secure.
                  No new card details needed if you already use PayPal.
                </p>
              </div>

              ${extensionBlock}

              <p style="margin:0 0 22px;font-size:15px;line-height:1.75;color:#374151;">
                When you're ready, lock in the <strong style="color:#e91e8c;">Founding Moms price of $3.25/month</strong> (billed $39/year — less than a Starbucks coffee ☕) — this special rate is only available for a limited time. Once it's gone, pricing goes back to $4.08/month.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;margin-bottom:28px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">What you unlock with Premium</p>
                    ${benefits.map((f) => `<p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.5;">${f}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
                <tr>
                  <td style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;padding:18px 24px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;text-decoration:line-through;">$4.08/month regular price</p>
                    <p style="margin:0;font-size:28px;font-weight:800;color:#e91e8c;">$3.25/month</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#9c27b0;font-weight:600;">Billed $39/year · Less than a Starbucks coffee ☕ · Locked in forever</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${p.appUrl}"
                       style="display:inline-block;padding:17px 44px;background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(233,30,140,0.35);">
                      💕 Open TwinTrack
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;font-size:13px;color:#9ca3af;line-height:1.7;text-align:center;">
                No pressure, ever. Core tracking (sleep, feeding, diapers) stays free forever. 💕
              </p>

              <hr style="border:none;border-top:1px solid #f3e8ff;margin:0 0 24px;"/>
            </td>
          </tr>

          <tr>
            <td style="background:#f9f5ff;padding:20px 32px;text-align:center;border-top:1px solid #f3e8ff;">
              <p style="margin:0;font-size:12px;color:#b8a9c9;line-height:1.8;">
                &copy; ${year} TwinTrack &middot; All About Twins<br/>
                <a href="https://allaboutwins.com" style="color:#c084fc;text-decoration:none;">allaboutwins.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Caregiver invite email ───────────────────────────────────────────────────

function buildCaregiverInviteHtml(p: CaregiverInviteParams): string {
  const twinsDisplay =
    p.twinNames.length === 0
      ? "the twins"
      : p.twinNames.length === 1
        ? p.twinNames[0]
        : `${p.twinNames.slice(0, -1).join(", ")} and ${p.twinNames[p.twinNames.length - 1]}`;

  const roleLabel =
    p.role === "Dad"
      ? "Dad"
      : p.role === "Partner"
        ? "Partner"
        : p.role === "Grandparent"
          ? "Grandparent"
          : p.role === "Nanny"
            ? "Nanny / Au Pair"
            : "Family Member";

  const features = [
    "🌙&nbsp; Track sleep — naps and night sessions",
    "🍼&nbsp; Log feedings — breast, bottle, solids",
    "🚼&nbsp; Record diaper changes in one tap",
    "📋&nbsp; Follow morning and bedtime routines",
    "📊&nbsp; See today's live dashboard for both babies",
  ];

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>You're invited to TwinTrack</title>
</head>
<body style="margin:0;padding:0;background:#fdf8ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,34,110,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);padding:44px 32px 36px;text-align:center;">
              <div style="margin-bottom:14px;font-size:44px;line-height:1;">👶</div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">TwinTrack by All About Twins</p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.35;">
                You've been invited<br/>to help with the twins 💕
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px;">
              <p style="margin:0 0 22px;font-size:16px;line-height:1.75;color:#374151;">
                Hi there! <strong style="color:#1a1a2e;">${p.parentName}</strong> has invited you
                to join their TwinTrack family as
                <strong style="color:#9c27b0;">${roleLabel}</strong> — the shared app they use to
                stay on top of everything for <strong style="color:#1a1a2e;">${twinsDisplay}</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;margin-bottom:32px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">
                      As a caregiver you can
                    </p>
                    ${features.map((f) => `<p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.5;">${f}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${p.inviteLink}"
                       style="display:inline-block;padding:17px 44px;background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(233,30,140,0.35);">
                      Accept Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:13px;color:#9ca3af;text-align:center;line-height:1.7;">
                Button not working?<br/>
                <a href="${p.inviteLink}" style="color:#9c27b0;word-break:break-all;font-size:12px;">${p.inviteLink}</a>
              </p>

              <hr style="border:none;border-top:1px solid #f3e8ff;margin:0 0 24px;"/>

              <p style="margin:0 0 32px;font-size:13px;color:#9ca3af;line-height:1.7;text-align:center;">
                TwinTrack helps twin families stay in sync — sleep, feeding, diapers and routines all in one place.<br/>
                This invitation was sent by ${p.parentName}. If you weren't expecting it, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9f5ff;padding:20px 32px;text-align:center;border-top:1px solid #f3e8ff;">
              <p style="margin:0;font-size:12px;color:#b8a9c9;line-height:1.8;">
                &copy; ${year} TwinTrack &middot; All About Twins<br/>
                <a href="https://allaboutwins.com" style="color:#c084fc;text-decoration:none;">allaboutwins.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Monthly recap email ───────────────────────────────────────────────────────

export interface MonthlyRecapParams {
  to: string;
  firstName: string;
  month: string;
  stats: {
    feedCount: number;
    sleepSessions: number;
    diaperChanges: number;
    memoriesAdded: number;
  };
  features: Array<{ icon: string; title: string; desc: string; url: string }>;
  appUrl: string;
}

export async function sendMonthlyRecapEmail(params: MonthlyRecapParams): Promise<EmailResult> {
  try {
    const { subject, html } = buildMonthlyRecapHtml(params);
    return await sendEmail({ to: params.to, subject, html });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildMonthlyRecapHtml(p: MonthlyRecapParams): { subject: string; html: string } {
  const year = new Date().getFullYear();
  const subject = `💕 Your TwinTrack ${p.month} Recap`;
  const name = p.firstName || "Twin Mama";

  const statRows = [
    { emoji: "🍼", label: "Feeding logs", value: p.stats.feedCount.toLocaleString() },
    { emoji: "😴", label: "Sleep sessions", value: p.stats.sleepSessions.toLocaleString() },
    { emoji: "💧", label: "Diaper changes", value: p.stats.diaperChanges.toLocaleString() },
    { emoji: "💕", label: "Memories captured", value: p.stats.memoriesAdded.toLocaleString() },
  ];

  const totalLogs = p.stats.feedCount + p.stats.sleepSessions + p.stats.diaperChanges;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#fdf8ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <div style="display:none;max-height:0;overflow:hidden;">Look how far you've come this month 💕&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fdf8ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,34,110,0.08);">

        <tr>
          <td style="background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);padding:44px 32px 36px;text-align:center;">
            <div style="margin-bottom:12px;font-size:48px;line-height:1;">💕</div>
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">TwinTrack Monthly Recap</p>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.4;">
              ${p.month}<br/><span style="font-size:18px;font-weight:600;">Your twin journey, by the numbers</span>
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#374151;">
              Hi ${name} 💕<br/><br/>
              Another month of incredible twin parenting done. You logged <strong>${totalLogs.toLocaleString()} entries</strong> across feeding, sleep, and diapers this month — that kind of care and consistency is remarkable.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background:#fdf8ff;border:1.5px solid #f3e8ff;border-radius:18px;margin-bottom:28px;">
              <tr><td style="padding:22px 24px;">
                <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">This month in numbers</p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  ${statRows.map(s => `
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #f3e8ff;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="font-size:20px;width:32px;">${s.emoji}</td>
                          <td style="font-size:14px;color:#374151;padding-left:8px;">${s.label}</td>
                          <td align="right" style="font-size:18px;font-weight:800;color:#e91e8c;">${s.value}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>`).join("")}
                </table>
              </td></tr>
            </table>

            ${p.features.length > 0 ? `
            <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">Many TwinTrack families also use…</p>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
              ${p.features.map(f => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f9f0ff;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="font-size:22px;width:36px;vertical-align:top;">${f.icon}</td>
                      <td style="padding-left:10px;vertical-align:top;">
                        <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1a1a2e;">${f.title}</p>
                        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">${f.desc}</p>
                      </td>
                      <td align="right" style="vertical-align:middle;padding-left:8px;">
                        <a href="${p.appUrl}${f.url}" style="font-size:11px;font-weight:700;color:#e91e8c;text-decoration:none;white-space:nowrap;">Explore →</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join("")}
            </table>` : ""}

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr><td align="center">
                <a href="${p.appUrl}"
                   style="display:inline-block;padding:17px 44px;background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:50px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(233,30,140,0.35);">
                  💕 Open TwinTrack
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 32px;font-size:14px;color:#9ca3af;line-height:1.75;text-align:center;">
              You're doing an amazing job. We're rooting for you every single day. 💕
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f9f5ff;padding:20px 32px;text-align:center;border-top:1px solid #f3e8ff;">
            <p style="margin:0;font-size:12px;color:#b8a9c9;line-height:1.8;">
              &copy; ${year} TwinTrack &middot; All About Twins<br/>
              <a href="https://allaboutwins.com" style="color:#c084fc;text-decoration:none;">allaboutwins.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
