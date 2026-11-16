-- Enable row-level security on every remaining table in public.
--
-- Hand-written, like *_add_rls_policies. Two reasons:
--
-- 1. Supabase exposes the public schema over its REST Data API to the
--    `anon` / `authenticated` roles. A table without RLS is readable by
--    anyone holding the project's anon key — including User.passwordHash.
--    With RLS enabled and no policy for those roles, they see nothing.
-- 2. Defence in depth for the restricted app_runtime role: a table it has
--    no policy on is deny-all, rather than open because of the blanket
--    GRANT in *_add_rls_policies.
--
-- ENABLE only, not FORCE: the owner connection (lib/prisma.ts, which runs
-- migrations and the non-tenant-sensitive queries) is the table owner and
-- must keep bypassing RLS on these tables.
--
-- app_runtime does read Property, Unit, StaffPropertyAssignment, Inspection
-- and InspectionChecklistItem — inside the existing Tenant/Lease/Payment/
-- TenantOffboarding policy subqueries, and via includes in
-- withRlsContext() transactions (statements, offboarding). Those five get
-- policies scoped exactly like the existing ones: LANDLORD sees all rows,
-- CARETAKER only rows on a property with a live StaffPropertyAssignment for
-- their staffId. The rest get no policy and are deny-all to app_runtime.

ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffPropertyAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InspectionChecklistItem" ENABLE ROW LEVEL SECURITY;

-- Deny-all to every non-owner role (no policies).
ALTER TABLE "StaffMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Levy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectricityPurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- A caretaker sees only their own assignment rows. This is the base the
-- other caretaker checks join through, so it must not itself reference
-- any other RLS-protected table.
CREATE POLICY staff_property_assignment_runtime_scope ON "StaffPropertyAssignment"
TO app_runtime
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR "StaffPropertyAssignment"."staffId" = current_setting('app.current_staff_id', true)
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
);

CREATE POLICY property_runtime_scope ON "Property"
TO app_runtime
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "StaffPropertyAssignment" spa
    WHERE spa."propertyId" = "Property".id
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
);

CREATE POLICY unit_runtime_scope ON "Unit"
TO app_runtime
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "StaffPropertyAssignment" spa
    WHERE spa."propertyId" = "Unit"."propertyId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
);

CREATE POLICY inspection_runtime_scope ON "Inspection"
TO app_runtime
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE u.id = "Inspection"."unitId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
);

CREATE POLICY inspection_checklist_item_runtime_scope ON "InspectionChecklistItem"
TO app_runtime
USING (
  current_setting('app.current_role', true) = 'LANDLORD'
  OR EXISTS (
    SELECT 1 FROM "Inspection" i
    JOIN "Unit" u ON u.id = i."unitId"
    JOIN "StaffPropertyAssignment" spa ON spa."propertyId" = u."propertyId"
    WHERE i.id = "InspectionChecklistItem"."inspectionId"
      AND spa."staffId" = current_setting('app.current_staff_id', true)
      AND spa."unassignedAt" IS NULL
  )
)
WITH CHECK (
  current_setting('app.current_role', true) = 'LANDLORD'
);
