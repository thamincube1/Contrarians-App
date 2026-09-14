# HAUSWERK — Internal Operations App

An internal operations tool for a 92-unit residential portfolio, used by two staff
roles — **Landlord** (full access: money, portfolio, deletion) and **Caretaker**
(restricted: repairs, inspections, unit lookup, no financial data). Currency is
ZAR (R). Tenants are not users of this app.

This implements the design in [`design_handoff_operations_app/`](design_handoff_operations_app/README.md)
as a Next.js app, using mock/local React state in place of a real API and database
(see that folder's spec for the intended production data layer, auth/RBAC, and schema).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4, plus a small set of hand-written CSS classes carrying the
  Modernist design tokens (`app/globals.css`)
- Archivo (via `next/font/google`)
- All state is local React state (`lib/store.tsx`) — no backend yet

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the role switcher in the
top bar to flip between the Landlord and Caretaker shells (in production, role
comes from the authenticated session, not a UI toggle).

## Structure

- `app/` — root layout and the single page route
- `components/landlord/` — sidebar, screen header, and the 9 landlord screens
  (Dashboard, Vacancy, Properties & units, Maintenance, Electricity, Inspections,
  Levies, Tenant record, Staff & access)
- `components/caretaker/` — the mobile-width caretaker shell (Home, repair form,
  inspection form, ticket detail) plus the design-notes panel
- `components/modals/` — Offboard tenant and Record payment dialogs
- `lib/store.tsx` — app state, actions, and derived view data
- `lib/mock-data.ts` — deterministic mock portfolio (3 properties, 92 units),
  tickets, inspections, levies, electricity purchases, and staff
