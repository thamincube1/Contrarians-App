import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { RlsActor } from "./prisma-rls";

/**
 * The one place route pages/layouts and Server Actions go to find out who
 * is signed in. Redirects to /login if there is no session — callers that
 * need a role-specific redirect instead (e.g. a landlord layout bouncing a
 * caretaker to /caretaker) should check `session.user.role` themselves
 * after calling this.
 */
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
});

/** Session user reshaped as the actor RLS-scoped queries expect. */
export function actorFromSession(session: Awaited<ReturnType<typeof verifySession>>): RlsActor {
  return { role: session.user.role, staffId: session.user.staffId };
}
