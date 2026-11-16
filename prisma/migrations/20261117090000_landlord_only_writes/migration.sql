-- Make writes on the four tenant-sensitive tables landlord-only.
--
-- *_add_rls_policies created one FOR ALL policy per table, so a CARETAKER
-- context could also INSERT/UPDATE/DELETE rows on its assigned properties.
-- No caretaker code path does (every write action is landlord-only in the
-- app), but the database should enforce it, not rely on the app.
--
-- Postgres can't change a policy's command in place, so each FOR ALL policy
-- is dropped and replaced by:
--   <table>_property_scope  FOR SELECT  -- the original read rule, unchanged
--   <table>_landlord_write  FOR ALL     -- only matches LANDLORD context
-- Policies are permissive (OR-ed): a landlord matches both, a caretaker only
-- the SELECT policy, so a caretaker's reads stay exactly as they were and
-- their writes are rejected.

DROP POLICY tenant_property_scope ON "Tenant";
DROP POLICY lease_property_scope ON "Lease";
DROP POLICY payment_property_scope ON "Payment";
DROP POLICY tenant_offboarding_property_scope ON "TenantOffboarding";

CREATE POLICY tenant_property_scope ON "Tenant" FOR SELECT
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
);

CREATE POLICY lease_property_scope ON "Lease" FOR SELECT
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE u.id = "Lease"."unitId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
);

CREATE POLICY payment_property_scope ON "Payment" FOR SELECT
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
);

CREATE POLICY tenant_offboarding_property_scope ON "TenantOffboarding" FOR SELECT
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
);

CREATE POLICY tenant_landlord_write ON "Tenant"
USING (current_setting('app.current_role', true) = 'LANDLORD')
WITH CHECK (current_setting('app.current_role', true) = 'LANDLORD');

CREATE POLICY lease_landlord_write ON "Lease"
USING (current_setting('app.current_role', true) = 'LANDLORD')
WITH CHECK (current_setting('app.current_role', true) = 'LANDLORD');

CREATE POLICY payment_landlord_write ON "Payment"
USING (current_setting('app.current_role', true) = 'LANDLORD')
WITH CHECK (current_setting('app.current_role', true) = 'LANDLORD');

CREATE POLICY tenant_offboarding_landlord_write ON "TenantOffboarding"
USING (current_setting('app.current_role', true) = 'LANDLORD')
WITH CHECK (current_setting('app.current_role', true) = 'LANDLORD');
