import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";

// Role gate for every /caretaker route — see app/landlord/layout.tsx for
// why the real boundary is the page-level check plus RLS, not this alone.
export default async function CaretakerLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (session.user.role !== "CARETAKER") redirect("/landlord");
  return <>{children}</>;
}
