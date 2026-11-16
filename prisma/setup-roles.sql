-- Runtime role setup for a fresh database (Supabase or any Postgres).
--
-- ORDER: run `npx prisma migrate deploy` FIRST, then this script, as the
-- owner/migration user (on Supabase: paste into the SQL editor, which runs
-- as `postgres`). Safe to re-run — e.g. to rotate the password.
--
-- Why it exists: the *_add_rls_policies migration already creates
-- app_runtime and its grants, but with a dev password that is committed to
-- this repo. This script sets a real password and re-asserts everything
-- the app depends on, so the result never relies on what that migration
-- happened to do.
--
-- BEFORE RUNNING: replace REPLACE_WITH_STRONG_PASSWORD below with a long
-- random password (e.g. `openssl rand -base64 32` — avoid @ : / ? # in it,
-- or URL-encode them in RUNTIME_DATABASE_URL). Edit it in the SQL editor,
-- not in this file — don't commit the real value.

DO $$
DECLARE
  pw text := 'REPLACE_WITH_STRONG_PASSWORD';
  r record;
BEGIN
  IF pw = 'REPLACE_WITH_STRONG_PASSWORD' OR length(pw) < 16 THEN
    RAISE EXCEPTION 'Set a real app_runtime password (16+ chars) before running this script';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime') THEN
    EXECUTE format('CREATE ROLE app_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD %L', pw);
  ELSE
    EXECUTE format('ALTER ROLE app_runtime LOGIN PASSWORD %L', pw);
  END IF;

  -- Attributes are only altered when wrong: on Supabase, `postgres` isn't
  -- a true superuser and may not be allowed to set some of them at all —
  -- in which case this fails loudly rather than leaving a role that
  -- silently skips RLS.
  SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole INTO r
  FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime';
  IF r.rolsuper THEN
    RAISE EXCEPTION 'app_runtime is a superuser — RLS would not apply. Recreate it as a normal role.';
  END IF;
  IF r.rolbypassrls THEN
    ALTER ROLE app_runtime NOBYPASSRLS;
  END IF;
  IF r.rolcreatedb OR r.rolcreaterole THEN
    ALTER ROLE app_runtime NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Future tables/sequences created by whoever runs this (the migration
-- user) are granted automatically, so a new migration doesn't need its own
-- GRANT. RLS still has to be enabled on each new table by its migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- Supabase only: its REST Data API reaches the public schema as `anon` /
-- `authenticated`. RLS already denies them every row; revoking the table
-- grants as well means a future table that forgets RLS still isn't exposed.
-- No-op on plain Postgres, where these roles don't exist.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

-- Verify — expect: app_runtime | f | f | 0
SELECT r.rolname, r.rolsuper, r.rolbypassrls,
       (SELECT count(*) FROM pg_catalog.pg_tables t WHERE t.tableowner = r.rolname) AS tables_owned
FROM pg_catalog.pg_roles r
WHERE r.rolname = 'app_runtime';
