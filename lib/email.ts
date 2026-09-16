import "server-only";
import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "HAUSWERK <onboarding@resend.dev>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailResult {
  ok: boolean;
  devMode: boolean;
  error?: string;
}

/**
 * Sends an email with one PDF attachment via Resend, or — when
 * RESEND_API_KEY isn't set — logs what would have been sent instead. This
 * is the dev-safe path: no real API key is needed to exercise statement/
 * invoice/demand generation locally, and nothing here has to change to go
 * live later beyond setting the env var.
 */
export async function sendEmailWithAttachment(input: {
  to: string;
  subject: string;
  html: string;
  attachment: EmailAttachment;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.log(
      `[email:dev-mode] to=${input.to} subject="${input.subject}" attachment=${input.attachment.filename} ` +
        `(${input.attachment.content.length} bytes) — set RESEND_API_KEY to actually send`
    );
    return { ok: true, devMode: true };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: [{ filename: input.attachment.filename, content: input.attachment.content }],
    });
    if (result.error) return { ok: false, devMode: false, error: result.error.message };
    return { ok: true, devMode: false };
  } catch (err) {
    return { ok: false, devMode: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}
