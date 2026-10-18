import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ARCHIVE_DIR = path.join(process.cwd(), "storage", "archives");

/**
 * Stores a generated offboarding archive PDF and returns a reference to
 * it. Dev default is local disk under storage/ (gitignored) — swap the
 * body of this function for `@vercel/blob`'s `put()` or an S3
 * `PutObjectCommand` in production. Nothing else needs to change: callers
 * (confirmOffboardAction) only ever see the returned reference, which is
 * what gets stored in TenantOffboarding.archiveUrl.
 */
export async function storeArchivePdf(filename: string, bytes: Buffer): Promise<string> {
  await mkdir(ARCHIVE_DIR, { recursive: true });
  await writeFile(path.join(ARCHIVE_DIR, filename), bytes);
  return `storage/archives/${filename}`;
}

// ---- Dev outbox ----
// Mirrors every email lib/email.ts would have sent while RESEND_API_KEY is
// unset, so a developer can actually open the generated PDFs instead of
// just trusting a console log line. Not used once a real API key is set —
// see sendEmailWithAttachment in lib/email.ts.

const OUTBOX_DIR = path.join(process.cwd(), "storage", "outbox");
const OUTBOX_INDEX = path.join(OUTBOX_DIR, "index.json");

export interface OutboxEntry {
  to: string;
  subject: string;
  sentAt: string; // ISO timestamp
  filename: string; // basename under storage/outbox/
}

/** Sanitizes a free-form label (a unit code, a tenant name, …) into a filename-safe chunk. */
function slugForFilename(label: string): string {
  return (
    label
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "email"
  );
}

/** Stores one dev-outbox PDF and appends a record to the index, returning the saved filename. */
export async function storeOutboxEmail(input: {
  to: string;
  subject: string;
  kind: string;
  label: string;
  pdf: Buffer;
}): Promise<OutboxEntry> {
  await mkdir(OUTBOX_DIR, { recursive: true });

  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `${datePrefix}_${slugForFilename(input.kind)}_${slugForFilename(input.label)}.pdf`;

  await writeFile(path.join(OUTBOX_DIR, filename), input.pdf);

  const entry: OutboxEntry = { to: input.to, subject: input.subject, sentAt: now.toISOString(), filename };

  let entries: OutboxEntry[] = [];
  try {
    entries = JSON.parse(await readFile(OUTBOX_INDEX, "utf8"));
  } catch {
    // No index yet, or it's corrupt — start fresh rather than fail the send.
  }
  entries.push(entry);
  await writeFile(OUTBOX_INDEX, JSON.stringify(entries, null, 2));

  return entry;
}

/** Newest-first list of everything storeOutboxEmail has recorded. */
export async function listOutboxEmails(): Promise<OutboxEntry[]> {
  try {
    const entries: OutboxEntry[] = JSON.parse(await readFile(OUTBOX_INDEX, "utf8"));
    return entries.slice().reverse();
  } catch {
    return [];
  }
}

/** Reads one outbox PDF by its exact (already-sanitized) filename, or null if it doesn't exist / isn't indexed. */
export async function readOutboxPdf(filename: string): Promise<Buffer | null> {
  const entries = await listOutboxEmails();
  if (!entries.some((e) => e.filename === filename)) return null; // only ever serve known, indexed files
  try {
    return await readFile(path.join(OUTBOX_DIR, filename));
  } catch {
    return null;
  }
}
