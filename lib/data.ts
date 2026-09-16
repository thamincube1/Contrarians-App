import "server-only";
import { prisma } from "./prisma";
import { withRlsContext, type RlsActor } from "./prisma-rls";
import { formatDateSlash, formatDayMonthYear, formatMonthSlashYear, formatMonthYear } from "./format";
import type {
  Inspection,
  InspectionCondition,
  InspectionType,
  Levy,
  PropertyDef,
  StaffMember as StaffMemberShape,
  Ticket,
  TicketPriority,
  TicketStatus,
  Unit,
} from "./types";

// ---- enum <-> display-label maps (DB stores enums; UI expects the exact
// prototype strings) ----

const TICKET_STATUS_LABEL: Record<string, TicketStatus> = {
  LOGGED: "Logged",
  IN_PROGRESS: "In progress",
  AWAITING_PARTS: "Awaiting parts",
  RESOLVED: "Resolved",
};
export const TICKET_STATUS_VALUE: Record<TicketStatus, "LOGGED" | "IN_PROGRESS" | "AWAITING_PARTS" | "RESOLVED"> = {
  Logged: "LOGGED",
  "In progress": "IN_PROGRESS",
  "Awaiting parts": "AWAITING_PARTS",
  Resolved: "RESOLVED",
};

const TICKET_PRIORITY_LABEL: Record<string, TicketPriority> = {
  ROUTINE: "Routine",
  URGENT: "Urgent",
  EMERGENCY: "Emergency",
};

const INSPECTION_TYPE_LABEL: Record<string, InspectionType> = {
  MOVE_IN: "Move-in",
  MOVE_OUT: "Move-out",
};
export const INSPECTION_TYPE_VALUE: Record<InspectionType, "MOVE_IN" | "MOVE_OUT"> = {
  "Move-in": "MOVE_IN",
  "Move-out": "MOVE_OUT",
};

export const INSPECTION_CONDITION_LABEL: Record<string, InspectionCondition> = {
  GOOD: "Good",
  FAIR: "Fair",
  DAMAGE_NOTED: "Damage noted",
  PENDING: "Pending",
};
export const INSPECTION_CONDITION_VALUE: Record<InspectionCondition, "GOOD" | "FAIR" | "DAMAGE_NOTED" | "PENDING"> = {
  Good: "GOOD",
  Fair: "FAIR",
  "Damage noted": "DAMAGE_NOTED",
  Pending: "PENDING",
};

// ---- reads ----

export async function getProperties(): Promise<PropertyDef[]> {
  const rows = await prisma.property.findMany({
    include: { _count: { select: { units: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((p) => ({
    id: p.key,
    name: p.name,
    prefix: p.prefix,
    count: p._count.units,
    baseRent: p.baseRent,
  }));
}

/**
 * Unit is the one UI shape that reaches into tenant-sensitive tables
 * (Lease.balance, Lease dates, Tenant name/phone), so it's the only read
 * here that needs the RLS-scoped connection and an acting user. A
 * caretaker's rows are already row-scoped to their assigned properties by
 * Postgres RLS (see prisma/migrations/*_add_rls_policies); the redaction
 * below additionally strips money fields for a caretaker even within
 * their own scope, matching the design spec ("no money, ever" — see
 * components/caretaker/DesignNotes.tsx).
 */
export async function getUnits(actor: RlsActor): Promise<Unit[]> {
  const units = await prisma.unit.findMany({
    include: { property: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const leases = await withRlsContext(actor, (tx) =>
    tx.lease.findMany({
      where: { status: "ACTIVE" },
      select: {
        unitId: true,
        balance: true,
        leaseEndDate: true,
        moveInDate: true,
        tenant: { select: { name: true, phone: true } },
      },
    })
  );
  const leaseByUnitId = new Map(leases.map((l) => [l.unitId, l]));
  const isLandlord = actor.role === "LANDLORD";

  return units.map((u) => {
    const lease = leaseByUnitId.get(u.id);
    return {
      id: u.id,
      label: u.label,
      property: u.property.name,
      // The UI's PropertyDef.id is the property's slug `key` (see
      // getProperties below), not the database's internal cuid — Unit.propertyId
      // in this flat shape must match that same slug for property-scoped
      // lookups (e.g. Dashboard's occupancy-by-property panel) to work.
      propertyId: u.property.key,
      rent: isLandlord ? u.rent : 0,
      vacant: u.status === "VACANT",
      notice: u.status === "NOTICE",
      vacantSince: u.vacantSince ? formatDayMonthYear(u.vacantSince) : null,
      tenant: lease ? lease.tenant.name : null,
      balance: isLandlord && lease ? lease.balance : 0,
      leaseEnd: isLandlord && lease ? formatMonthSlashYear(lease.leaseEndDate) : "",
      moveIn: isLandlord && lease ? formatDateSlash(lease.moveInDate) : "",
      phone: lease ? lease.tenant.phone : "",
      meter: u.meterNumber,
    };
  });
}

export async function getTickets(): Promise<Ticket[]> {
  const rows = await prisma.maintenanceTicket.findMany({
    include: {
      unit: true,
      photos: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((t) => ({
    id: t.ref,
    unit: t.unit.label,
    title: t.title,
    status: TICKET_STATUS_LABEL[t.status],
    priority: TICKET_PRIORITY_LABEL[t.priority],
    via: t.viaLabel,
    meta: t.metaLabel,
    desc: t.description,
    photos: t.photos.map((p) => ({ label: p.label })),
    timeline: t.events.map((e) => ({ when: e.whenLabel, what: e.what })),
  }));
}

/**
 * Split into the fixed seed fixtures (in their original order) and
 * everything logged through the app since (newest first) — the Inspections
 * screen shows fixtures first, with fresh entries appended after, exactly
 * like the original mock's `[...INSPECTIONS_BASE, ...inspectExtra]`.
 */
export async function getInspections(): Promise<{ base: Inspection[]; extra: Inspection[] }> {
  const rows = await prisma.inspection.findMany({
    include: { unit: { include: { property: true } }, caretaker: true },
  });
  const map = (i: (typeof rows)[number]): Inspection => ({
    id: i.ref,
    unit: i.unit.label,
    property: i.unit.property.name,
    type: INSPECTION_TYPE_LABEL[i.type],
    date: i.inspectedOn ? formatDayMonthYear(i.inspectedOn) : "—",
    tenant: i.tenantLabelAtTime,
    condition: INSPECTION_CONDITION_LABEL[i.condition],
    caretaker: i.caretaker?.name ?? "—",
    photos: i.photoCount,
  });
  const base = rows
    .filter((r) => r.seedOrder !== null)
    .sort((a, b) => a.seedOrder! - b.seedOrder!)
    .map(map);
  const extra = rows
    .filter((r) => r.seedOrder === null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(map);
  return { base, extra };
}

/**
 * Split into the fixed seed fixtures (in their original order) and
 * everything captured through the app since (newest first) — the Levies
 * screen shows fixtures first, with fresh entries appended after, exactly
 * like the original mock's `[...LEVIES_BASE, ...levyExtra]`.
 */
export async function getLevies(): Promise<{ base: Levy[]; extra: Levy[] }> {
  const rows = await prisma.levy.findMany({ include: { property: true } });
  const map = (l: (typeof rows)[number]): Levy => ({
    month: formatMonthYear(l.period),
    property: l.property.name,
    amount: l.amount,
    note: l.note,
  });
  const base = rows
    .filter((r) => r.seedOrder !== null)
    .sort((a, b) => a.seedOrder! - b.seedOrder!)
    .map(map);
  const extra = rows
    .filter((r) => r.seedOrder === null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(map);
  return { base, extra };
}

export interface ElectricityPurchaseRow {
  date: string;
  unit: string;
  token: string;
  amount: number;
  kwh: number;
  recharge: boolean;
}

function mapElectricityPurchase(
  p: Awaited<ReturnType<typeof prisma.electricityPurchase.findMany>>[number] & { unit: { label: string } }
): ElectricityPurchaseRow {
  return {
    date: formatDayMonthYear(p.purchasedOn),
    unit: p.unit.label,
    token: p.token,
    amount: p.amount,
    kwh: p.kwh,
    recharge: p.recharge,
  };
}

/**
 * Split into the fixed seed fixtures (in their original order) and
 * everything captured through the app since (newest first) — the
 * Electricity screen concatenates extra-before-base itself, so the two
 * lists are kept separate rather than pre-joined.
 */
export async function getElectricityPurchases(): Promise<{
  base: ElectricityPurchaseRow[];
  extra: ElectricityPurchaseRow[];
}> {
  const rows = await prisma.electricityPurchase.findMany({ include: { unit: true } });
  const extra = rows
    .filter((r) => r.seedOrder === null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(mapElectricityPurchase);
  const base = rows
    .filter((r) => r.seedOrder !== null)
    .sort((a, b) => a.seedOrder! - b.seedOrder!)
    .map(mapElectricityPurchase);
  return { base, extra };
}

export async function getStaff(): Promise<StaffMemberShape[]> {
  const rows = await prisma.staffMember.findMany({
    include: { propertyAssignments: { include: { property: true } } },
    orderBy: { createdAt: "asc" },
  });
  const totalProperties = await prisma.property.count();
  return rows.map((s) => {
    const names = s.propertyAssignments.map((a) => a.property.name);
    let props: string;
    if (s.role === "LANDLORD") {
      props = "All — " + names.join(", ");
    } else if (names.length >= totalProperties) {
      props = names.join(", ");
    } else if (names.length === 1) {
      props = names[0] + " only";
    } else {
      props = names.join(", ");
    }
    return {
      name: s.name,
      role: s.role === "LANDLORD" ? "Landlord" : "Caretaker",
      props,
      canClose: s.canCloseLabel,
      active: s.lastActiveLabel,
    };
  });
}

export interface InitialData {
  units: Unit[];
  tickets: Ticket[];
  inspectionsBase: Inspection[];
  inspectionsExtra: Inspection[];
  leviesBase: Levy[];
  leviesExtra: Levy[];
  electricityBase: ElectricityPurchaseRow[];
  electricityExtra: ElectricityPurchaseRow[];
  staff: StaffMemberShape[];
  properties: PropertyDef[];
}

export async function getInitialData(actor: RlsActor): Promise<InitialData> {
  const [units, tickets, inspections, levies, electricity, staff, properties] = await Promise.all([
    getUnits(actor),
    getTickets(),
    getInspections(),
    getLevies(),
    getElectricityPurchases(),
    getStaff(),
    getProperties(),
  ]);
  return {
    units,
    tickets,
    inspectionsBase: inspections.base,
    inspectionsExtra: inspections.extra,
    leviesBase: levies.base,
    leviesExtra: levies.extra,
    electricityBase: electricity.base,
    electricityExtra: electricity.extra,
    staff,
    properties,
  };
}
