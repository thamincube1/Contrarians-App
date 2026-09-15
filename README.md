# HAUSWERK — Internal Operations App

An internal operations tool for a 92-unit residential portfolio, used by two staff
roles — **Landlord** (full access: money, portfolio, deletion) and **Caretaker**
(restricted: repairs, inspections, unit lookup, no financial data). Currency is
ZAR (R). Tenants are not users of this app.

This implements the design in [`design_handoff_operations_app/`](design_handoff_operations_app/README.md)
as a Next.js app backed by a real Postgres database via Prisma (see that folder's
spec for the intended production auth/RBAC, offline outbox, and roadmap).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4, plus a small set of hand-written CSS classes carrying the
  Modernist design tokens (`app/globals.css`)
- System font stack (`-apple-system`, …)
- PostgreSQL via Prisma ORM — schema in `prisma/schema.prisma`, reads in
  `lib/data.ts`, writes via Server Actions in `lib/actions.ts`

## Getting started

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at a Postgres
   database (a free [Neon](https://neon.tech) or [Supabase](https://supabase.com)
   project both work, as does a local Postgres install).
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

Open [http://localhost:3000](http://localhost:3000). Use the role switcher in the
top bar to flip between the Landlord and Caretaker shells (in production, role
comes from the authenticated session, not a UI toggle).

`npm run db:studio` opens Prisma Studio to browse/edit the database directly.

## Structure

- `app/page.tsx` — server component that fetches initial data (`lib/data.ts`)
  and hands it to the client app (`components/App.tsx`); always dynamically
  rendered so it reflects the latest writes
- `components/landlord/` — sidebar, screen header, and the 9 landlord screens
  (Dashboard, Vacancy, Properties & units, Maintenance, Electricity, Inspections,
  Levies, Tenant record, Staff & access)
- `components/caretaker/` — the mobile-width caretaker shell (Home, repair form,
  inspection form, ticket detail) plus the design-notes panel
- `components/modals/` — Offboard tenant and Record payment dialogs
- `lib/store.tsx` — client-side app state (navigation, form drafts, cached
  data) and the actions components call; delegates persistence to `lib/actions.ts`
- `lib/data.ts` — server-only Prisma reads, mapped into the exact shapes the
  UI already expects (`lib/types.ts`)
- `lib/actions.ts` — Server Actions for every write (payments, electricity/levy
  capture, ticket status changes, tenant offboarding, caretaker submissions)
- `lib/prisma.ts` — the Prisma client singleton
- `prisma/schema.prisma` — the data model (Property, Unit, Tenant, Lease,
  Payment, MaintenanceTicket + photos/events, Inspection + checklist items,
  ElectricityPurchase, Levy, StaffMember + property assignments, TenantOffboarding)
- `prisma/seed.ts` — loads the same fixture dataset the app used to generate
  in memory, so the UI looks identical to the original mock-data prototype

## Notes on the offboarding flow

"Offboard & anonymise" and "Erase completely" both end the lease, free the
unit, and strip the tenant's personal details in place (name/phone replaced,
status set to `OFFBOARDED`) — the lease and ledger keep referencing the same
tenant row so financial history stays intact, matching the design spec's
warning against destroying it with a naive delete. "Erase completely"
additionally deletes the lease's payment history. A `TenantOffboarding` row
is written first as an audit snapshot of what the tenant record held.
