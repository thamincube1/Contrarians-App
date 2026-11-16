import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// ---- Object storage backend ----
// Supabase Storage (a private bucket) when SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET are all set — which
// production must, since Vercel's filesystem doesn't persist between
// invocations. Otherwise local disk under storage/ (gitignored), which is
// what local development uses with no setup.
//
// Talks to the Storage REST API with plain fetch rather than
// @supabase/supabase-js: four endpoints don't justify the dependency.
// Every key passed in here is server-built (never raw user input).

const LOCAL_ROOT = path.join(process.cwd(), "storage");

interface SupabaseConfig {
  url: string;
  key: string;
  bucket: string;
}

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !key || !bucket) return null;
  return { url: url.replace(/\/+$/, ""), key, bucket };
}

function supabaseHeaders(cfg: SupabaseConfig): Record<string, string> {
  // New-style secret keys (sb_secret_…) go in `apikey` only — the gateway
  // swaps them for a service-role JWT. Legacy JWT service_role keys also
  // need to be the bearer token.
  return cfg.key.startsWith("sb_") ? { apikey: cfg.key } : { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` };
}

function objectPath(cfg: SupabaseConfig, key: string): string {
  return `${encodeURIComponent(cfg.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function putObject(key: string, bytes: Buffer | string, contentType: string): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) {
    const file = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return;
  }
  const res = await fetch(`${cfg.url}/storage/v1/object/${objectPath(cfg, key)}`, {
    method: "POST",
    headers: { ...supabaseHeaders(cfg), "Content-Type": contentType, "x-upsert": "true" },
    body: typeof bytes === "string" ? bytes : new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`Storage upload failed for ${key}: ${res.status} ${await res.text()}`);
}

async function getObject(key: string): Promise<Buffer | null> {
  const cfg = supabaseConfig();
  if (!cfg) {
    try {
      return await readFile(path.join(LOCAL_ROOT, key));
    } catch {
      return null;
    }
  }
  const res = await fetch(`${cfg.url}/storage/v1/object/authenticated/${objectPath(cfg, key)}`, {
    headers: supabaseHeaders(cfg),
    cache: "no-store",
  });
  if (!res.ok) return null; // Supabase answers a missing object with 400 or 404
  return Buffer.from(await res.arrayBuffer());
}

/**
 * A time-limited URL for reading one private object — how anything stored
 * here (archive PDFs, and photos once capture uploads them) should be handed
 * to a browser. Null on the local-disk backend, which has no URL of its own;
 * serve those through an authorized route handler instead (see
 * app/landlord/dev/outbox/pdf/route.ts).
 */
export async function createSignedUrl(key: string, expiresInSeconds = 60 * 10): Promise<string | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  const res = await fetch(`${cfg.url}/storage/v1/object/sign/${objectPath(cfg, key)}`, {
    method: "POST",
    headers: { ...supabaseHeaders(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  if (!res.ok) return null;
  const { signedURL } = (await res.json()) as { signedURL?: string };
  return signedURL ? `${cfg.url}/storage/v1${signedURL}` : null;
}

/**
 * Stores a generated offboarding archive PDF and returns its storage key,
 * which is what gets saved in TenantOffboarding.archiveUrl — pass it to
 * createSignedUrl() to open it.
 */
export async function storeArchivePdf(filename: string, bytes: Buffer): Promise<string> {
  const key = `archives/${filename}`;
  await putObject(key, bytes, "application/pdf");
  return key;
}

// ---- Dev outbox ----
// Mirrors every email lib/email.ts would have sent while RESEND_API_KEY is
// unset, so a developer can actually open the generated PDFs instead of
// just trusting a console log line. Not used once a real API key is set —
// see sendEmailWithAttachment in lib/email.ts.

const OUTBOX_INDEX = "outbox/index.json";

export interface OutboxEntry {
  to: string;
  subject: string;
  sentAt: string; // ISO timestamp
  filename: string; // basename under outbox/
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

async function readOutboxIndex(): Promise<OutboxEntry[]> {
  const raw = await getObject(OUTBOX_INDEX);
  if (!raw) return [];
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    return []; // corrupt — start fresh rather than fail the send
  }
}

/** Stores one dev-outbox PDF and appends a record to the index, returning the saved entry. */
export async function storeOutboxEmail(input: {
  to: string;
  subject: string;
  kind: string;
  label: string;
  pdf: Buffer;
}): Promise<OutboxEntry> {
  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `${datePrefix}_${slugForFilename(input.kind)}_${slugForFilename(input.label)}.pdf`;

  await putObject(`outbox/${filename}`, input.pdf, "application/pdf");

  const entry: OutboxEntry = { to: input.to, subject: input.subject, sentAt: now.toISOString(), filename };
  // Read-modify-write without locking: two simultaneous sends can drop an
  // index line. Acceptable for a dev-only log; the PDFs themselves survive.
  const entries = await readOutboxIndex();
  entries.push(entry);
  await putObject(OUTBOX_INDEX, JSON.stringify(entries, null, 2), "application/json");

  return entry;
}

/** Newest-first list of everything storeOutboxEmail has recorded. */
export async function listOutboxEmails(): Promise<OutboxEntry[]> {
  return (await readOutboxIndex()).reverse();
}

/** Reads one outbox PDF by its exact (already-sanitized) filename, or null if it doesn't exist / isn't indexed. */
export async function readOutboxPdf(filename: string): Promise<Buffer | null> {
  const entries = await readOutboxIndex();
  if (!entries.some((e) => e.filename === filename)) return null; // only ever serve known, indexed files
  return getObject(`outbox/${filename}`);
}
