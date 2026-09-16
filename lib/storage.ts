import "server-only";
import { mkdir, writeFile } from "fs/promises";
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
