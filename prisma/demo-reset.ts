// Wipes every app table and reloads the demo seed — for putting a demo
// database back to a known state (e.g. before showing it to a client).
//
//   npm run db:demo-reset -- --yes
//
// Runs against DATABASE_URL (the owner connection), keeps the schema and
// migration history, and only deletes rows. Refuses to touch a local
// database unless --allow-local is also passed, so it can't wipe a dev
// database by accident when .env still points at localhost. Files already
// in object storage (archive PDFs, outbox) are left alone.

import "dotenv/config";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const args = new Set(process.argv.slice(2));
  const url = new URL(process.env.DATABASE_URL ?? "");
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const target = `${url.hostname}${url.pathname}`;

  if (!args.has("--yes")) {
    console.error(`This deletes ALL data in ${target} and reseeds demo data. Re-run with --yes to confirm.`);
    process.exit(1);
  }
  if (isLocal && !args.has("--allow-local")) {
    console.error(`${target} is a local database — pass --allow-local as well if you really mean to wipe it.`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length > 0) {
      const list = tables.map((t) => `"public"."${t.tablename.replace(/"/g, '""')}"`).join(", ");
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }
    console.log(`Wiped ${tables.length} tables in ${target}.`);
  } finally {
    await prisma.$disconnect();
  }

  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
