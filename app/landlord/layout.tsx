import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";

// Role gate for every /landlord route. This is a second line of defense
// alongside proxy.ts's optimistic cookie check — the actual data scoping
// (RLS + redaction) happens in lib/data.ts/lib/actions.ts regardless of
// whether this check runs, since layouts aren't re-evaluated on
// client-side navigation (see Next's auth guide, "Layouts and auth
// checks"). This app has no client-side route navigation within
// /landlord, so that caveat doesn't bite here, but the page-level check in
// page.tsx is the one that actually matters.
export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") redirect("/caretaker");
  return <>{children}</>;
}
