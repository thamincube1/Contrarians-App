import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await verifySession();
  redirect(session.user.role === "CARETAKER" ? "/caretaker" : "/landlord");
}
