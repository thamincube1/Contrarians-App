import { redirect } from "next/navigation";
import App from "@/components/App";
import { getInitialData } from "@/lib/data";
import { verifySession, actorFromSession } from "@/lib/dal";

// Reads live from Postgres on every request (writes made through the app —
// payments, offboarding, new captures — must show up on next load).
export const dynamic = "force-dynamic";

export default async function LandlordHome() {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") redirect("/caretaker");

  const initial = await getInitialData(actorFromSession(session));
  return <App initial={initial} role="landlord" userName={session.user.name} />;
}
