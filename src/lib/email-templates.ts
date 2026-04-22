interface StreakRecoveryOpts {
  hunterName: string;
  appUrl: string;
}

export function streakRecoveryHtml(opts: StreakRecoveryOpts): string {
  const { hunterName, appUrl } = opts;
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>The System awaits your return.</title>
  </head>
  <body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#cbd5e1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020617;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f172a;border:1px solid rgba(34,211,238,0.3);">
            <tr>
              <td style="padding:40px 32px 24px 32px;text-align:center;border-bottom:1px solid rgba(34,211,238,0.15);">
                <p style="margin:0;font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:#22d3ee;opacity:0.8;">
                  [ The System ]
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#e0f2fe;letter-spacing:0.02em;">
                  Hunter ${escapeHtml(hunterName)}, the gates are still open.
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                  The System noticed your absence. Three days of silence.
                </p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                  Your active dungeons haven't ended — not yet. A run paused is still a run. One quest today, and the combo stays alive.
                </p>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#94a3b8;font-style:italic;">
                  You built a mirror. Use it.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td align="center">
                      <a href="${appUrl}" style="display:inline-block;padding:14px 36px;background:rgba(34,211,238,0.15);border:1px solid #22d3ee;color:#e0f2fe;font-size:12px;letter-spacing:0.35em;text-transform:uppercase;text-decoration:none;font-weight:700;">
                        Return to The System
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid rgba(34,211,238,0.15);text-align:center;">
                <p style="margin:0;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#475569;">
                  Shivaliva Leveling
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}