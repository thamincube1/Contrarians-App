# HAUSWERK — Internal Operations App

An internal operations tool for a 92-unit residential portfolio, used by two staff
roles — **Landlord** (full access: money, portfolio, deletion) and **Caretaker**
(restricted: repairs, inspections, unit lookup, no financial data). Currency is
ZAR (R). Tenants are not users of this app.

This implements the design in [`design_handoff_operations_app/`](design_handoff_operations_app/README.md)
as a Next.js app backed by a real Postgres database via Prisma, with real
session-based auth (Auth.js) and Postgres row-level security enforcing the
Landlord/Caretaker boundary at the database layer.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4, plus a small set of hand-written CSS classes carrying the
  Modernist design tokens (`app/globals.css`)
- System font stack (`-apple-system`, …)
- PostgreSQL via Prisma ORM — schema in `prisma/schema.prisma`, reads in
  `lib/data.ts`, writes via Server Actions in `lib/actions.ts`
- Auth.js (NextAuth v5) with a Credentials provider — `lib/auth.ts`
- Postgres row-level security on Tenant/Lease/Payment/TenantOffboarding —
  `prisma/migrations/*_add_rls_policies`, applied via `lib/prisma-rls.ts`

## Getting started

1. Copy `.env.example` to `.env` and fill in three things:
   - `DATABASE_URL` — a Postgres connection string for running migrations
     (a free [Neon](https://neon.tech) or [Supabase](https://supabase.com)
     project both work, as does a local Postgres install). This user must
     **own** the tables (whatever runs `prisma migrate` against a fresh
     database becomes the owner) — row-level security does not apply to
     table owners, which is exactly why the app never queries through this
     connection at runtime.
   - `RUNTIME_DATABASE_URL` — a second, restricted Postgres role for all
     runtime queries. Locally this is the `app_runtime` role the RLS
     migration creates for you; on a hosted Postgres, create a second
     non-owner role/user with `SELECT/INSERT/UPDATE/DELETE` on the schema.
   - `AUTH_SECRET` — a random secret for signing sessions (`openssl rand
     -base64 32`).
2. Install dependencies and set up the schema:

   ```bash
   npm install
   npm run db:migrate   # applies prisma/migrations, or use `npx prisma migrate deploy` in CI
   npm run db:seed      # loads the fixture portfolio (3 properties, 92 units, etc.)
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) — you'll land on `/login`.
The seed creates two dev logins (password `hauswerk-dev` for both):

| Email | Role |
| --- | --- |
| `brandt@hauswerk.dev` | Landlord — full access |
| `nel@hauswerk.dev` | Caretaker — repairs/inspections/unit lookup only |

Signing in redirects to `/landlord` or `/caretaker` based on the session's
role; each route's `layout.tsx` (and `page.tsx`) redirects away anyone whose
session role doesn't match, and `proxy.ts` does the same optimistically at
the edge before a route even renders. There is no role switcher in the UI
anymore — role comes entirely from the authenticated session.

`npm run db:studio` opens Prisma Studio to browse/edit the database directly
(as the migration/owner user — RLS won't apply there either).

## Structure

- `app/login/` — the sign-in screen (`components/LoginForm.tsx` + the
  `loginAction`/`logoutAction` Server Actions in `lib/auth-actions.ts`)
- `app/landlord/`, `app/caretaker/` — one route tree per role. Each
  `layout.tsx` and `page.tsx` calls `verifySession()` (`lib/dal.ts`) and
  redirects to the other route if the session's role doesn't match; each
  `page.tsx` fetches that role's initial data and renders `components/App.tsx`
- `app/page.tsx` — `/` just redirects to `/landlord` or `/caretaker`
- `proxy.ts` — optimistic, cookie-only redirects (unauthenticated → `/login`,
  wrong role → the other route) before a route renders; the real boundary is
  `lib/dal.ts` + RLS, not this file (see the comment in `app/landlord/layout.tsx`)
- `components/landlord/` — sidebar, screen header, and the 9 landlord screens
  (Dashboard, Vacancy, Properties & units, Maintenance, Electricity, Inspections,
  Levies, Tenant record, Staff & access)
- `components/caretaker/` — the mobile-width caretaker shell (Home, repair form,
  inspection form, ticket detail) plus the design-notes panel
- `components/modals/` — Offboard tenant and Record payment dialogs
- `lib/store.tsx` — client-side app state (navigation, form drafts, cached
  data) and the actions components call; delegates persistence to `lib/actions.ts`.
  The signed-in role is passed in once from the server and never changes client-side
- `lib/data.ts` — server-only Prisma reads, mapped into the exact shapes the
  UI already expects (`lib/types.ts`); `getUnits()` is the one read that
  touches tenant-sensitive tables and goes through the RLS-scoped connection
- `lib/actions.ts` — Server Actions for every write (payments, electricity/levy
  capture, ticket status changes, tenant offboarding, caretaker submissions);
  every action calls `verifySession()` first, and the ones touching
  Tenant/Lease/Payment/TenantOffboarding run inside `withRlsContext()`
- `lib/auth.ts` — Auth.js config (Credentials provider, JWT sessions)
- `lib/dal.ts` — `verifySession()`, the one place routes/actions check who's
  signed in; redirects to `/login` if there's no session
- `lib/prisma.ts` — the Prisma client singleton, connected as the
  migration/owner user (bypasses RLS — only for non-sensitive tables)
- `lib/prisma-rls.ts` — a second Prisma client connected as the restricted
  `app_runtime` role, plus `withRlsContext(actor, fn)`, which opens a
  transaction, sets `app.current_role`/`app.current_staff_id` as Postgres
  session variables, and runs `fn` against tables where RLS enforces the
  Landlord/Caretaker property scoping
- `prisma/schema.prisma` — the data model (Property, Unit, Tenant, Lease,
  Payment, MaintenanceTicket + photos/events, Inspection + checklist items,
  ElectricityPurchase, Levy, StaffMember + property assignments,
  TenantOffboarding, User)
- `prisma/migrations/*_add_rls_policies` — hand-written raw SQL (Prisma has
  no first-class RLS concept): creates the `app_runtime` role and enables +
  forces row-level security on Tenant/Lease/Payment/TenantOffboarding, with
  policies that let a `LANDLORD` see everything and a `CARETAKER` see only
  rows whose unit's property has a live `StaffPropertyAssignment` for their
  staff id
- `prisma/seed.ts` — loads the same fixture dataset the app used to generate
  in memory, so the UI looks identical to the original mock-data prototype,
  plus the two dev logins above

## Notes on authorization

Three layers, from outermost to innermost:

1. **`proxy.ts`** — reads the session cookie only (no DB call) and redirects
   obviously-wrong requests (signed out, or the wrong role for the route)
   before the route even renders.
2. **`lib/dal.ts` + route layouts/pages** — `verifySession()` is called in
   every `/landlord` and `/caretaker` layout and page, and in every Server
   Action in `lib/actions.ts`. This is the real authentication check.
3. **Postgres row-level security** — even if every check above were somehow
   bypassed, a `CARETAKER`-scoped query physically cannot return Tenant,
   Lease, Payment or TenantOffboarding rows outside that caretaker's
   assigned properties, because the database connection for those queries
   uses the restricted `app_runtime` role with `FORCE ROW LEVEL SECURITY`
   policies — not the migration/owner connection, which would bypass RLS
   entirely. `getUnits()` additionally redacts money fields (balance, rent,
   lease dates) for a caretaker actor even within their own scope, matching
   the design spec ("no money, ever" — see `components/caretaker/DesignNotes.tsx`).

To verify the RLS scoping directly with SQL (bypassing the app entirely),
connect as `app_runtime` and set the session variables the same way
`withRlsContext()` does:

```sql
BEGIN;
SELECT set_config('app.current_role', 'CARETAKER', true);
SELECT set_config('app.current_staff_id', '<a caretaker StaffMember.id>', true);
SELECT count(*) FROM "Tenant"; -- only rows for that caretaker's assigned properties
ROLLBACK;
```

## Notes on the offboarding flow

"Offboard & anonymise" and "Erase completely" both end the lease, free the
unit, and strip the tenant's personal details in place (name/phone replaced,
status set to `OFFBOARDED`) — the lease and ledger keep referencing the same
tenant row so financial history stays intact, matching the design spec's
warning against destroying it with a naive delete. "Erase completely"
additionally deletes the lease's payment history. A `TenantOffboarding` row
is written first as an audit snapshot of what the tenant record held.
