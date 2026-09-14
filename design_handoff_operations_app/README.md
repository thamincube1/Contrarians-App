# Handoff: Property Management Operations App

## Overview
An internal operations tool for a 92-unit residential portfolio, used by two staff roles — **Landlord** (full access: money, portfolio, deletion) and **Caretaker** (restricted: repairs, inspections, unit lookup, no financial data). Tenants are not users of this app (no tenant portal in this phase). Currency is ZAR (R).

## About the Design Files
The files in this bundle are **design references built in HTML** — interactive prototypes showing intended layout, content, and behavior, not production code to copy directly. The task is to **recreate these designs in the target codebase's environment** (React/Next.js per the spec, or whatever the existing app already uses) using that codebase's own components, state management, and data layer. Treat the HTML/CSS/JS here as the source of truth for layout, copy, and interaction — not as code to paste in.

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy are final (Modernist design system: Archivo typeface, flat surfaces, 2px rules, zero corner radius, accent red #ec3013 on a light ground #f3f2f2). All interactions in the prototype (role switch, navigation, forms, modals) are wired with mock/local state — the developer should reproduce the same UI and replace the mock state with real API calls per the spec's schema.

## Screens / Views

### Shared header
Sticky top bar: brand mark + "HAUSWERK — Internal ops" wordmark, and a role switcher (Landlord / Caretaker) that swaps the entire app body below it. This switcher is a **prototype-only convenience** — in production, role comes from the authenticated session, not a UI toggle.

### Landlord shell
Two-column layout: 224px left sidebar nav + main content.
**Sidebar nav items** (each with a badge count where relevant): Dashboard, Vacancy, Properties & units, Maintenance, Electricity, **Inspections**, **Levies**, Tenants, Staff & access.

1. **Dashboard** — 4-metric stat row (Occupied, Vacant, Rent billed, Open repairs) + two-column panel: occupancy heatmap per property (row of cells, black=occupied/red=vacant/grey=on notice) and caretaker activity feed; electricity summary per property with link to capture purchases.
2. **Vacancy board** — stat row (vacant now, avg days vacant, rent lost MTD, on notice) + table of vacant/on-notice units with days vacant, rent lost, ready-to-let status.
3. **Properties & units** — searchable/filterable table of all units (unit, property, tenant, rent, balance, status). Row click opens the Tenant record.
4. **Maintenance** — kanban board, 4 columns (Logged / In progress / Awaiting parts / Resolved), cards show ref, priority tag, title, meta, report channel.
5. **Electricity** — stat row + purchase ledger table (date, unit, token, amount, kWh, c/kWh with anomaly highlighting) alongside a "Capture a purchase" form (unit, amount, kWh, token, receipt photo slot, recharge-to-tenant toggle, live rate sanity check).
6. **Inspections** *(new)* — stat row (logged this year, move-outs, damage noted, pending) + table of move-in/move-out inspection records: unit, property, type (tag), date, tenant, condition (Good/Fair/Damage noted — red if damage), caretaker, photo count. Sourced from caretaker-submitted inspections. A move-out record with condition feeds the tenant offboarding checklist ("Move-out inspection" line item).
7. **Levies** *(new)* — stat row (levies this month/last month, outstanding, YTD total) + levy ledger table (month, property, amount, note) alongside a "Capture a levy" form: property picker (segmented buttons, one row per property — levies are captured **per property**, not per unit), amount, note, save.
8. **Tenant record** — header with tags (arrears/current, lease end, meter type, demand-sent flag), name/contact, current balance; action buttons: Record payment, Email statement, **Send letter of demand** *(new — enabled only when balance is overdue; generates + emails + queues a printed letter, sets a "Demand sent" tag)*, Offboard tenant. Below: lease/tenant detail list and last-6-months electricity history.
9. **Staff & access** — table of staff (name, role, assigned properties, can-close-tickets permission, last active) with a note on RLS enforcement.

### Caretaker shell
390px mobile-width panel + design-notes panel alongside it (notes panel is documentation only, not part of the real UI).
- **Home**: greeting, one-line summary, primary "Log a repair" button, secondary **"Log a move-in / move-out inspection" button** *(new)*, list of "My tickets".
- **New repair form**: unit input (with tenant lookup hint), category grid (6 buttons), description textarea, photo capture slots, urgency segmented control, "reported via" segmented control, submit (label changes to "Save to outbox — will sync" when offline).
- **New inspection form** *(new)*: type toggle (Move-in / Move-out), unit input (with tenant/vacancy hint), condition segmented control (Good / Fair / Damage noted — red when selected), notes textarea, photo capture slots, submit ("Submit inspection" / offline variant).
- **Ticket detail**: ref, unit, title, description, photos, "Move status" step buttons (Logged → In progress → Awaiting parts → Resolved), history timeline.
- Offline simulation toggle demonstrates the outbox badge ("Synced" vs "Offline · N waiting to upload").

### Modals
- **Offboard tenant** (landlord only): exit checklist (balance, deposit, open repairs, move-out inspection — each with a status dot/state), deletion mode radio (Offboard & anonymise vs Erase completely), type-to-confirm text field, confirm/cancel actions.
- **Record payment**: amount field, allocation note, post-to-ledger/cancel actions.

## Interactions & Behavior
- Role switch re-renders the whole app body (landlord vs caretaker shell) — in production this is driven by the authenticated user's role, not client-side state.
- Nav item click sets the active screen; active item shown in accent red + bold.
- Table rows for units are clickable → route to that unit's Tenant record.
- Electricity/levy capture forms append a new row to the top of their ledger and show a toast confirmation.
- Inspection form: submitting appends to the Inspections table; a "Damage noted" move-out is what should later block/flag the offboarding checklist.
- Letter of demand button is disabled/grey when balance is not overdue; clicking when overdue flips a "Demand sent" tag on the tenant and shows a toast. In production this should trigger the actual PDF/email generation described in the spec (Resend + React-PDF).
- Offboard modal: confirm button disabled until the typed confirmation word matches ("OFFBOARD" or "ERASE" depending on mode); on confirm, unit becomes vacant and tenant record is removed/anonymised per selected mode.
- Toast notifications: bottom-left, auto-dismiss after 3s.
- All "stubbed" prototype actions (e.g. "Export month", "Assign vendor") show a toast saying the action isn't wired — these represent real actions to be implemented.

## State Management
Real implementation needs, per the spec (see Property Platform Spec v2 in this bundle):
- Auth session carrying role (landlord/caretaker) and, for caretakers, assigned property IDs — enforced via Postgres RLS, not just UI hiding.
- Units, leases, tenants, invoices/ledger, electricity purchases, **levies** (per property, monthly), **inspections** (per unit, move-in/move-out, condition, photos, linked to lease), maintenance tickets, staff/access table.
- Offline outbox (IndexedDB) for caretaker-submitted repairs and inspections, syncing on reconnect.
- Letter-of-demand generation should be a server action/job: check overdue balance past grace period → generate PDF → email + log to tenant's record → mark "sent".

## Design Tokens
From the Modernist design system:
- Ground: `#f3f2f2`; text ink: `#201e1d`; accent: `#ec3013` (deep accent for text-on-tint: `#ae1800`/`#7c1405`); neutral fills: `#eae9e9`, `#d7d3d3`; muted text: `#605d5d`, `#444141`, `#9b9797`.
- Type: Archivo (400/500/600/800 weights), tabular numerals for all currency/counts.
- Structure: 2px solid dividers between major regions (`rgba(32,30,29,.4)`), 1px for minor row rules (`rgba(32,30,29,.14–.25)`). Zero border-radius throughout. No shadows.
- Status tag colors: vacant/emergency = accent red fill; on-notice/awaiting = neutral grey; resolved = light neutral; damage-noted = deep accent text.

## Assets
No external images — all photo/receipt slots are diagonal-hatch placeholders (`repeating-linear-gradient`) representing where a real captured photo will render. No icons used beyond simple colored squares/dots as status indicators.

## Files
- `Operations App.dc.html` — the full interactive prototype (landlord + caretaker shells, all screens including Inspections and Levies, offboarding and payment modals).
- `Property Platform Spec v2.dc.html` — the technical blueprint: revised stack, roles/RBAC, and (continuing past what's excerpted here) the schema and roadmap referenced above.
