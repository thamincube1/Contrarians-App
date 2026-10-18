import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { readOutboxPdf } from "@/lib/storage";

// Serves one PDF from the dev outbox (see app/landlord/dev/outbox/page.tsx
// and lib/storage.ts). Route Handlers don't inherit the /landlord layout's
// role redirect, so the production and role checks are repeated here
// explicitly. readOutboxPdf only ever returns a file that's actually
// listed in the outbox index, so `file` can't be used to read anything
// else off disk.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const session = await verifySession();
  if (session.user.role !== "LANDLORD") {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = req.nextUrl.searchParams.get("file");
  if (!file) return new NextResponse("Missing file", { status: 400 });

  const pdf = await readOutboxPdf(file);
  if (!pdf) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
