-- Row-level security for tenant-sensitive tables.
--
-- Prisma has no first-class RLS concept, so this migration is hand-written
-- raw SQL rather than derived from schema.prisma. It does two things:
--
-- 1. Creates a restricted, non-owner Postgres role ("app_runtime") for all
--    application runtime queries. RLS is enforced against every role
--    *except* the table owner and superusers, so the app must never
--    connect as the migration user (which owns these tables) once RLS is
--    turned on — see lib/prisma-rls.ts, which points at
--    RUNTIME_DATABASE_URL instead of DATABASE_URL.
-- 2. Enables + forces RLS on Tenant, Lease, Payment and TenantOffboarding,
--    with policies scoped by two Postgres session variables that the app
--    sets per-request/transaction (see withRlsContext in
--    lib/prisma-rls.ts):
--      app.current_role      -- 'LANDLORD' | 'CARETAKER'
--      app.current_staff_id  -- the acting StaffMember.id
--
--    LANDLORD sees everything. CARETAKER only sees rows whose unit's
--    property has a live (unassignedAt IS NULL) StaffPropertyAssignment
--    for their staffId.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime_dev_password';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Lease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lease" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TenantOffboarding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantOffboarding" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_property_scope ON "Tenant"
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE l."tenantId" = "Tenant".id
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE l."tenantId" = "Tenant".id
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
);

CREATE POLICY lease_property_scope ON "Lease"
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE u.id = "Lease"."unitId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE u.id = "Lease"."unitId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
);

CREATE POLICY payment_property_scope ON "Payment"
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE l.id = "Payment"."leaseId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE l.id = "Payment"."leaseId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
);

CREATE POLICY tenant_offboarding_property_scope ON "TenantOffboarding"
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE l.id = "TenantOffboarding"."leaseId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON u.id = l."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE l.id = "TenantOffboarding"."leaseId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
);
