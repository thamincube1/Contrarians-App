import { redirect } from "next/navigation";
import App from "@/components/App";
import { getInitialData } from "@/lib/data";
import { verifySession, actorFromSession } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function CaretakerHome() {
  const session = await verifySession();
  if (session.user.role !== "CARETAKER") redirect("/landlord");

  const initial = await getInitialData(actorFromSession(session));
  return <App initial={initial} role="caretaker" userName={session.user.name} />;
}
