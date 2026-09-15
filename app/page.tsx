import App from "@/components/App";
import { getInitialData } from "@/lib/data";

// This page reads live data from Postgres on every request — writes made
// through the app (payments, offboarding, new captures) must show up on
// the next load, so it must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await getInitialData();
  return <App initial={initial} />;
}
