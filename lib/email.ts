import "server-only";
import { Resend } from "resend";
import { storeOutboxEmail } from "./storage";

const FROM = process.env.RESEND_FROM_EMAIL || "Contrarians Properties <onboarding@resend.dev>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailResult {
  ok: boolean;
  devMode: boolean;
  error?: string;
  /** Set only in dev mode — where the mirrored PDF landed, for logging/debugging. */
  outboxPath?: string;
}

/**
 * Sends an email with one PDF attachment via Resend, or — when
 * RESEND_API_KEY isn't set — logs what would have been sent instead and
 * mirrors the PDF to storage/outbox/ (see lib/storage.ts) so it can
 * actually be opened, via the /landlord/dev/outbox page. This is the
 * dev-safe path: no real API key is needed to exercise statement/invoice/
 * demand generation locally, and nothing here has to change to go live
 * later beyond setting the env var.
 */
export async function sendEmailWithAttachment(input: {
  to: string;
  subject: string;
  html: string;
  attachment: EmailAttachment;
  /** What kind of document this is (e.g. "statement") — used only for the dev-outbox filename. */
  kind: string;
  /** A short identifier (e.g. the unit label) — used only for the dev-outbox filename. */
  label: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    const entry = await storeOutboxEmail({
      to: input.to,
      subject: input.subject,
      kind: input.kind,
      label: input.label,
      pdf: input.attachment.content,
    });
    const outboxPath = `storage/outbox/${entry.filename}`;
    console.log(
      `[email:dev-mode] to=${input.to} subject="${input.subject}" attachment=${input.attachment.filename} ` +
        `(${input.attachment.content.length} bytes) saved to ${outboxPath} — set RESEND_API_KEY to actually send`
    );
    return { ok: true, devMode: true, outboxPath };
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
