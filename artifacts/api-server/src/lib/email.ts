import { Resend } from "resend";

export interface CaregiverInviteParams {
  to: string;
  parentName: string;
  twinNames: string[];
  role: string;
  inviteLink: string;
}

export interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

async function sendWithResend(params: CaregiverInviteParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "TwinTrack <hello@allaboutwins.com>",
    to: params.to,
    subject: `${params.parentName} invited you to help with the twins 💕`,
    html: buildCaregiverInviteHtml(params),
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id };
}

export async function sendCaregiverInvite(params: CaregiverInviteParams): Promise<EmailResult> {
  try {
    const result = await sendWithResend(params);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

function buildCaregiverInviteHtml(p: CaregiverInviteParams): string {
  const twinsDisplay =
    p.twinNames.length === 0
      ? "the twins"
      : p.twinNames.length === 1
        ? p.twinNames[0]
        : `${p.twinNames.slice(0, -1).join(", ")} and ${p.twinNames[p.twinNames.length - 1]}`;

  const roleLabel =
    p.role === "Dad" ? "Dad"
    : p.role === "Partner" ? "Partner"
    : p.role === "Grandparent" ? "Grandparent"
    : p.role === "Nanny" ? "Nanny / Au Pair"
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

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#e91e8c 0%,#9c27b0 100%);padding:44px 32px 36px;text-align:center;">
              <div style="margin-bottom:14px;font-size:44px;line-height:1;">👶</div>
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);">TwinTrack by All About Twins</p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.35;">
                You've been invited<br/>to help with the twins 💕
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:36px 32px 8px;">

              <p style="margin:0 0 22px;font-size:16px;line-height:1.75;color:#374151;">
                Hi there! <strong style="color:#1a1a2e;">${p.parentName}</strong> has invited you
                to join their TwinTrack family as
                <strong style="color:#9c27b0;">${roleLabel}</strong> — the shared app they use to
                stay on top of everything for <strong style="color:#1a1a2e;">${twinsDisplay}</strong>.
              </p>

              <!-- Features box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#fdf8ff;border:1px solid #f3e8ff;border-radius:16px;margin-bottom:32px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9c27b0;">
                      As a caregiver you can
                    </p>
                    ${features.map(f => `
                    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.5;">${f}</p>`).join("")}
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
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

              <!-- Fallback link -->
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

          <!-- FOOTER -->
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
