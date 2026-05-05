"use server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";

const BUG_REPORT_EMAIL =
  process.env.BUG_REPORT_EMAIL ?? "trojanato@gmail.com";

const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_URL_LENGTH = 500;
const MAX_USER_AGENT_LENGTH = 500;

export async function submitBugReport(opts: {
  description: string;
  contextUrl: string;
  userAgent: string;
}): Promise<{ ok: boolean; error?: string }> {
  const description = opts.description.trim();
  if (!description) {
    return { ok: false, error: "Tell us what went wrong." };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: "Description too long (max 5000 chars)." };
  }

  const contextUrl = opts.contextUrl.slice(0, MAX_URL_LENGTH);
  const userAgent = opts.userAgent.slice(0, MAX_USER_AGENT_LENGTH);

  // Identity is best-effort. Anonymous reports are still useful — never
  // block a submission on Clerk lookup failing.
  let identityLine = "anonymous (not signed in)";
  let subjectPrefix = "Anonymous";
  try {
    const { userId } = await auth();
    if (userId) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const meta = user.unsafeMetadata as { hunterName?: string } | undefined;
      const hunterName =
        meta?.hunterName ||
        user.firstName ||
        user.emailAddresses[0]?.emailAddress.split("@")[0] ||
        "unknown";
      const email = user.emailAddresses[0]?.emailAddress ?? "no-email";
      identityLine = `${hunterName} · ${email} · ${userId}`;
      subjectPrefix = hunterName;
    }
  } catch {
    // Fall through to anonymous.
  }

  const html = `
    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #1f2937;">
      <h2 style="margin: 0 0 16px 0; color: #0e7490;">Bug Report</h2>
      <table style="border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">From</td><td style="padding: 4px 0;">${escapeHtml(identityLine)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">URL</td><td style="padding: 4px 0;">${escapeHtml(contextUrl)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">When</td><td style="padding: 4px 0;">${new Date().toISOString()}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Agent</td><td style="padding: 4px 0; color: #6b7280; font-size: 11px;">${escapeHtml(userAgent)}</td></tr>
      </table>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 13px; line-height: 1.5; margin: 0; padding: 12px; background: #f9fafb; border-radius: 4px;">${escapeHtml(description)}</pre>
    </div>
  `;

  const subjectSnippet = description.slice(0, 60).replace(/\s+/g, " ").trim();
  const result = await sendEmail({
    to: BUG_REPORT_EMAIL,
    subject: `[Bug] ${subjectPrefix}: ${subjectSnippet}`,
    html,
  });

  if (!result.ok) {
    if (result.skipped) {
      return { ok: false, error: "Reporting is offline right now. Try again later." };
    }
    return { ok: false, error: "Couldn't send report. Try again." };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] ?? c
  );
}
