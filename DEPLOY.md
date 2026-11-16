# Deploying Contrarians Properties (Supabase + Vercel)

Postgres and file storage on Supabase, the Next.js app on Vercel. Do the steps in order: each one depends on the step before it. Allow about 45 minutes the first time.

Commands are for **PowerShell** on Windows, run from the repo root. They set connection strings **for the current terminal only**, so your `.env` (and your local database) are never touched. Close the terminal when you're done, or run `Remove-Item Env:DATABASE_URL, Env:SEED_PASSWORD`.

---

## 1. Create the Supabase project

1. <https://supabase.com/dashboard> → **New project**.
2. **Region**: choose the region closest to your users that Vercel also has, e.g. *West EU (London)* = Vercel `lhr1`, or *Central EU (Frankfurt)* = Vercel `fra1`. Write it down; Vercel must use the matching region (step 7).
3. **Database password**: generate one and save it in your password manager. This is the owner password (`<db-password>` below).
4. Once it's created, note the **project ref**: the `abcdefghijklmnop` part of `https://abcdefghijklmnop.supabase.co`.

### Turn off the public Data API

The app never uses Supabase's REST/GraphQL API. It talks to Postgres directly through Prisma. **Project Settings → Data API → disable it.** Every table also has RLS and step 4 revokes the API roles' grants, but there's no reason to leave the endpoint open.

---

## 2. Connection strings

Dashboard → **Connect** (top bar) → **Session pooler**. Copy that URI. It looks like:

```
postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Use the **session pooler (port 5432)**, not the transaction pooler (6543) and not the direct connection. The direct host is IPv6-only, which Vercel can't reach. The transaction pooler works but needs extra Prisma flags.

You'll build two URLs from it. They use the same host and port but different users:

| Variable | User | Password | Used for |
|---|---|---|---|
| `DATABASE_URL` | `postgres.<project-ref>` | the database password from step 1 | `prisma migrate deploy`, seeding, and runtime queries on non-tenant-sensitive tables |
| `RUNTIME_DATABASE_URL` | `app_runtime.<project-ref>` | the password you choose in step 4 | every runtime query on Tenant / Lease / Payment / TenantOffboarding, where RLS is enforced |

Append `?connection_limit=2` to **both** URLs. Each Vercel function instance opens two Prisma clients, and the session pooler has a small connection cap (15 on the smallest compute). Prisma's default pool size would exhaust it with just two warm instances.

```
DATABASE_URL="postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres?connection_limit=2"
RUNTIME_DATABASE_URL="postgresql://app_runtime.<ref>:<app-runtime-password>@aws-0-<region>.pooler.supabase.com:5432/postgres?connection_limit=2"
```

If a password contains `@ : / ? #` or `%`, URL-encode it (`@` → `%40`, etc.).

---

## 3. Create the schema: `migrate deploy`

```powershell
$env:DATABASE_URL = "postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres?connection_limit=2"
npx prisma migrate deploy
```

Expect `All migrations have been successfully applied.` (7 migrations). This creates every table, enables RLS on all of them, and creates the `app_runtime` role, **with a dev password that is public in this repo**. Do step 4 right away.

Use `migrate deploy`, never `migrate dev` or `migrate reset`, against Supabase.

---

## 4. Set up the runtime role: `prisma/setup-roles.sql`

1. Generate the app_runtime password, for example `openssl rand -base64 32`, or 32+ random letters and digits from a password manager.
2. Supabase dashboard → **SQL Editor** → New query → paste all of [`prisma/setup-roles.sql`](prisma/setup-roles.sql).
3. **In the editor** (not the file, so it never gets committed), replace `REPLACE_WITH_STRONG_PASSWORD` with that password.
4. Run. The last result row must read **`app_runtime | false | false | 0`**: not a superuser, no BYPASSRLS, owns no tables.

This sets the real password, makes sure the role can't bypass RLS, grants table and sequence access (including on future tables), and revokes the Supabase API roles' access. It's safe to re-run, for example to rotate the password.

Order matters: **migrate deploy → setup-roles.sql**. Re-run the role script after any future migration that adds tables only if you've rotated or recreated the role. Otherwise the default privileges cover new tables automatically.

---

## 5. Load the demo data

The seed is fictional: generated names, phone numbers and meters, and `@example.com` tenant emails. It creates two logins:

- Landlord: `brandt@hauswerk.dev`
- Caretaker: `nel@hauswerk.dev`

Both use the password you pass as `SEED_PASSWORD`. The seed refuses to run against a non-local database without it, because the dev password is public.

```powershell
# same terminal as step 3, DATABASE_URL still set
$env:SEED_PASSWORD = "<demo login password, 12+ chars>"
npx prisma db seed
```

Expect `Seed complete.` The seed only runs on an empty database. To **wipe and reload** later, for example before the demo:

```powershell
npm run db:demo-reset -- --yes
```

This deletes every row (schema and migrations are kept) and reseeds. It refuses to run without `--yes`, and refuses a localhost database unless `--allow-local` is also given. It doesn't delete PDFs already in Storage.

---

## 6. File storage bucket

Generated PDFs (offboarding archives, and the dev-mode email outbox) go to Supabase Storage. Vercel's filesystem doesn't persist.

1. Dashboard → **Storage** → **New bucket** → name `documents` → **leave "Public bucket" OFF** (private).
2. Dashboard → **Project Settings → API Keys** → copy the **secret** key (`sb_secret_…`), or the legacy `service_role` key. **This key bypasses all security. It goes only into Vercel's server env, never into any `NEXT_PUBLIC_` variable and never into git.**
3. The **Project URL** is `https://<project-ref>.supabase.co`.

Files are read back through short-lived signed URLs (`createSignedUrl` in `lib/storage.ts`); nothing in the bucket is publicly addressable.

---

## 7. Vercel

1. <https://vercel.com/new> → import the GitHub repo. The framework preset is detected as **Next.js**. Leave the build and install commands at their defaults (`postinstall` runs `prisma generate`).
2. **Environment Variables** (Production; add Preview too if you'll use preview deploys):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | step 2, owner URL |
   | `RUNTIME_DATABASE_URL` | step 2, app_runtime URL |
   | `AUTH_SECRET` | a **new** value from `openssl rand -base64 32` (don't reuse your local one) |
   | `AUTH_URL` | leave unset on a `*.vercel.app` domain; set to `https://your-domain` if you add a custom domain |
   | `RESEND_API_KEY` | your Resend key, or **leave unset** so emails are logged and their PDFs go to `outbox/` in the bucket instead of being sent |
   | `RESEND_FROM_EMAIL` | `Contrarians Properties <onboarding@resend.dev>` until you verify a domain (see below) |
   | `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | step 6 secret key |
   | `SUPABASE_STORAGE_BUCKET` | `documents` |

   Don't set `NODE_ENV`; Vercel sets it to `production`.
3. **Settings → Functions → Function Region**: set it to the region matching Supabase (step 1). The default (`iad1`, US East) adds a transatlantic round trip to every query, and the landlord dashboard makes several.
4. Deploy. When it's live, run the smoke tests below.

### Email (Resend)

- With no `RESEND_API_KEY`, nothing is sent; that's the safe default for a demo.
- With a key and `onboarding@resend.dev`, Resend only delivers to **your own Resend account's email**. Seed tenants are `@example.com` and won't receive anything.
- To send to real addresses, verify a domain in Resend (DNS records on your domain), then set `RESEND_FROM_EMAIL="Contrarians Properties <statements@your-domain>"`.

---

## 8. Smoke tests after deploy

### Basics

- [ ] `https://<app>/login` loads; landlord login → `/landlord`; caretaker login → `/caretaker`.
- [ ] Landlord: open a tenant record → **Send statement**. You get a success toast. With no Resend key, check that a PDF appears under `outbox/` in the Storage bucket.
- [ ] `https://<app>/landlord/dev/outbox` → **404** while logged in as landlord (dev-only page).
- [ ] `https://<app>/landlord/dev/outbox/pdf?file=x` → **404**.
- [ ] Phone (Chrome on Android or Safari on iOS): open `/caretaker` → **Install app / Add to Home Screen** is offered, and the installed app opens standalone with the Contrarians icon. DevTools → Application → Manifest shows no installability errors.

### RLS / role isolation (log in as the **caretaker**)

- [ ] `/landlord` and `/landlord/dev/outbox` in the address bar → redirected to `/caretaker`, never landlord data.
- [ ] View page source of `/caretaker` and search for `leviesBase` and `electricityBase`. Both must be followed by `[]` (empty). **No levy or electricity purchase amounts are sent to a caretaker.**
- [ ] Units in the caretaker views show **no balances, rent or lease dates** (zeroed or empty).
- [ ] Sending a statement, invoice or demand as the caretaker is impossible: there's no UI for it, and the server actions return "Not authorized".

### RLS at the database level (Supabase SQL Editor)

Run each block on its own. The editor runs as `postgres`, so `SET LOCAL ROLE` switches to the restricted role just for the transaction. If that fails with *permission denied to set role* (Postgres 16+ doesn't let a role's creator switch to it by default), run `GRANT app_runtime TO postgres;` once and retry.

```sql
-- 1. No context at all → every count is 0
begin; set local role app_runtime;
select (select count(*) from "Tenant") t, (select count(*) from "Lease") l,
       (select count(*) from "Payment") p, (select count(*) from "Levy") lv,
       (select count(*) from "User") u;
rollback;

-- 2. Caretaker with no property assignments → 0 everywhere
begin; set local role app_runtime;
select set_config('app.current_role','CARETAKER',true), set_config('app.current_staff_id','nobody',true);
select (select count(*) from "Tenant") t, (select count(*) from "Lease") l,
       (select count(*) from "Payment") p, (select count(*) from "Unit") un;
rollback;

-- 3. Levy / ElectricityPurchase / User / StaffMember → 0 even as landlord
--    (app_runtime has no policy on them; the app reads them via the owner role)
begin; set local role app_runtime;
select set_config('app.current_role','LANDLORD',true);
select (select count(*) from "Levy") lv, (select count(*) from "ElectricityPurchase") e,
       (select count(*) from "User") u;
rollback;

-- 4. Caretaker can't write → expect "new row violates row-level security policy"
begin; set local role app_runtime;
select set_config('app.current_role','CARETAKER',true),
       set_config('app.current_staff_id', (select "staffId" from "User" where role='CARETAKER' limit 1), true);
update "Lease" set balance = balance;
rollback;
```

---

## Known limitations

- **Caretaker scoping is partly app-level.** RLS scopes Tenant, Lease, Payment and TenantOffboarding (plus Unit, Property and Inspection for the restricted role). But the caretaker page still loads units, tickets, inspections and the staff list for **all** properties through the owner connection, so they aren't filtered by assignment. Levy and electricity data is withheld from caretakers.
- **Photos are not uploaded.** Repair and inspection forms record a photo *count* with placeholder tiles; no image is captured or stored yet. `lib/storage.ts` (`putObject`/`createSignedUrl`) is where real uploads would go.
- **The dev outbox page is local-only.** With no Resend key in production, PDFs still land in `outbox/` in the bucket, but there's no in-app page to browse them. Use the Storage dashboard.
