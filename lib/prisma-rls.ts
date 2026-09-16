import "server-only";
import { PrismaClient, type Prisma } from "@prisma/client";

// Separate connection from lib/prisma.ts, deliberately: RLS policies (see
// prisma/migrations/*_add_rls_policies) are only enforced against
// non-superuser, non-table-owner roles. lib/prisma.ts connects as the
// migration/owner user and would silently bypass RLS, so every query
// against a tenant-sensitive table (Tenant, Lease, Payment,
// TenantOffboarding) must go through this client instead, scoped with
// withRlsContext().
const globalForRls = globalThis as unknown as { prismaRls?: PrismaClient };

export const prismaRls =
  globalForRls.prismaRls ??
  new PrismaClient({
    datasources: { db: { url: process.env.RUNTIME_DATABASE_URL } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForRls.prismaRls = prismaRls;

export interface RlsActor {
  role: "LANDLORD" | "CARETAKER";
  staffId: string;
}

/**
 * Runs `fn` inside a transaction with the acting user's role/staffId set as
 * Postgres session variables (via `set_config(..., true)`, i.e. `SET
 * LOCAL` scoped to the transaction) so the RLS policies on Tenant, Lease,
 * Payment and TenantOffboarding can evaluate `current_setting('app.current_role', true)`
 * / `current_setting('app.current_staff_id', true)`. Bound as query
 * parameters (not string-interpolated SQL) to avoid injection.
 */
export async function withRlsContext<T>(
  actor: RlsActor,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prismaRls.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_role', ${actor.role}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_staff_id', ${actor.staffId}, true)`;
    return fn(tx);
  });
}
