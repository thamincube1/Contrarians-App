"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { withRlsContext } from "./prisma-rls";
import { verifySession, actorFromSession } from "./dal";
import { formatDayMonthYear, formatMonthYear } from "./format";
import { INSPECTION_CONDITION_VALUE, INSPECTION_TYPE_VALUE, TICKET_STATUS_VALUE } from "./data";
import type {
  ElectricityPurchase as ElectricityPurchaseShape,
  Inspection,
  InspectFormState,
  Levy,
  RepairFormState,
  TicketStatus,
} from "./types";

const TODAY = new Date(2026, 8, 2); // the app's fixed in-story "today"

/** True when `err` is a unique-constraint violation on `field`. */
function isUniqueViolation(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    !!(err.meta?.target as string[] | undefined)?.includes(field)
  );
}

export interface SubmitResult {
  ok: boolean;
  reason?: string;
}

function randomToken(): string {
  const block = () => Math.floor(1000 + Math.random() * 8999);
  return `4213 8894 ${block()} ${block()}`;
}

// ---- Electricity ----

export async function saveElectricityPurchaseAction(input: {
  unitLabel: string;
  amount: number;
  kwh: number;
  token: string;
  recharge: boolean;
}): Promise<ElectricityPurchaseShape | null> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return null;

  const unit = await prisma.unit.findUnique({ where: { label: input.unitLabel.trim().toUpperCase() } });
  if (!unit) return null;

  const row = await prisma.electricityPurchase.create({
    data: {
      unitId: unit.id,
      purchasedOn: TODAY,
      amount: input.amount,
      kwh: input.kwh,
      token: input.token || randomToken(),
      recharge: input.recharge,
      seedOrder: null,
    },
  });

  return {
    date: formatDayMonthYear(row.purchasedOn),
    unit: unit.label,
    token: row.token,
    amount: row.amount,
    kwh: row.kwh,
    recharge: row.recharge,
  };
}

// ---- Levies ----

export async function saveLevyAction(input: {
  propertyKey: string;
  amount: number;
  note: string;
}): Promise<Levy | null> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return null;

  const property = await prisma.property.findUnique({ where: { key: input.propertyKey } });
  if (!property) return null;

  const period = new Date(2026, 8, 1); // "Sep 2026" — matches the prototype's fixed capture month
  const row = await prisma.levy.create({
    data: {
      propertyId: property.id,
      period,
      amount: input.amount,
      note: input.note || "Manual capture",
      seedOrder: null,
    },
  });

  return { month: formatMonthYear(row.period), property: property.name, amount: row.amount, note: row.note };
}

// ---- Tenant record: payment, demand, offboarding ----

export async function savePaymentAction(input: {
  unitId: string;
  amount: number;
}): Promise<{ newBalance: number } | null> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return null;
  const actor = actorFromSession(session);

  return withRlsContext(actor, async (tx) => {
    const lease = await tx.lease.findFirst({ where: { unitId: input.unitId, status: "ACTIVE" } });
    if (!lease) return null;

    const newBalance = Math.max(0, lease.balance - input.amount);
    await tx.payment.create({ data: { leaseId: lease.id, amount: input.amount, paidAt: TODAY } });
    await tx.lease.update({ where: { id: lease.id }, data: { balance: newBalance } });

    return { newBalance };
  });
}

export async function sendDemandAction(input: { unitId: string }): Promise<boolean> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return false;
  const actor = actorFromSession(session);

  return withRlsContext(actor, async (tx) => {
    const lease = await tx.lease.findFirst({ where: { unitId: input.unitId, status: "ACTIVE" } });
    if (!lease || lease.balance <= 0) return false;
    await tx.lease.update({ where: { id: lease.id }, data: { demandSent: true } });
    return true;
  });
}

export async function confirmOffboardAction(input: {
  unitId: string;
  purgeMode: "anonymise" | "hard";
}): Promise<{ tenantName: string; unitLabel: string } | null> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return null;
  const actor = actorFromSession(session);

  return withRlsContext(actor, async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { unitId: input.unitId, status: "ACTIVE" },
      include: { tenant: true, unit: true },
    });
    if (!lease) return null;

    const tenantName = lease.tenant.name;
    const unitLabel = lease.unit.label;

    await tx.tenantOffboarding.create({
      data: {
        leaseId: lease.id,
        tenantSnapshot: {
          tenant: { name: lease.tenant.name, phone: lease.tenant.phone },
          lease: {
            balance: lease.balance,
            depositHeld: lease.depositHeld,
            moveInDate: lease.moveInDate,
            leaseEndDate: lease.leaseEndDate,
          },
        },
        purgeMode: input.purgeMode === "hard" ? "HARD_DELETE" : "ANONYMISE",
        performedAt: TODAY,
      },
    });

    await tx.lease.update({ where: { id: lease.id }, data: { status: "ENDED" } });
    await tx.unit.update({ where: { id: input.unitId }, data: { status: "VACANT", vacantSince: TODAY } });

    if (input.purgeMode === "hard") {
      // "Erase completely" — also removes the payment (ledger) history for this lease.
      await tx.payment.deleteMany({ where: { leaseId: lease.id } });
    }
    // Both modes anonymise the tenant's personal details in place — the lease,
    // invoices and ledger keep referencing the tenant row, but it now carries
    // no contact information. A true hard delete of the tenant row itself
    // would violate the Lease.tenantId foreign key and is deliberately not
    // done here, matching the spec's own warning against destroying
    // financial history.
    await tx.tenant.update({
      where: { id: lease.tenantId },
      data: { name: "—", phone: "—", status: "OFFBOARDED" },
    });

    return { tenantName, unitLabel };
  });
}

// ---- Caretaker writes ----

// Both caretaker submissions below take a client-generated `clientId` (a
// UUID minted by the offline outbox — see lib/outbox.ts) and are written to
// be safely retried: the offline outbox always flushes optimistically and
// may call these more than once for the same entry (the caretaker's device
// dies mid-flush, two tabs race, a background-sync retry overlaps an
// in-page one, …). `clientId` is unique in the schema, so a repeat call
// either finds the row it already created and returns success without
// writing again, or hits the unique constraint on a true concurrent race
// and re-reads the winner — never a duplicate ticket/inspection.

export async function submitTicketAction(
  input: RepairFormState & { clientId: string }
): Promise<SubmitResult> {
  await verifySession();

  const existing = await prisma.maintenanceTicket.findUnique({ where: { clientId: input.clientId } });
  if (existing) return { ok: true };

  const unit = await prisma.unit.findUnique({ where: { label: input.unit.trim().toUpperCase() } });
  if (!unit) return { ok: false, reason: "Unit not found — check the unit number" };

  const priorityMap: Record<RepairFormState["urgency"], "ROUTINE" | "URGENT" | "EMERGENCY"> = {
    Routine: "ROUTINE",
    Urgent: "URGENT",
    Emergency: "EMERGENCY",
  };
  const viaMap: Record<RepairFormState["via"], "WHATSAPP" | "IN_PERSON" | "PHONE"> = {
    WhatsApp: "WHATSAPP",
    "In person": "IN_PERSON",
    Phone: "PHONE",
  };

  try {
    const count = await prisma.maintenanceTicket.count();
    const ref = "MR-" + (2414 + count);
    await prisma.maintenanceTicket.create({
      data: {
        ref,
        clientId: input.clientId,
        unitId: unit.id,
        title: input.desc.slice(0, 80) || input.cat,
        description: input.desc || input.cat,
        status: "LOGGED",
        priority: priorityMap[input.urgency],
        reportedVia: viaMap[input.via],
        viaLabel: input.via,
        metaLabel: `Logged ${formatDayMonthYear(TODAY)} · ${input.photos} photo${input.photos === 1 ? "" : "s"}`,
        loggedAt: TODAY,
        events: { create: [{ whenLabel: formatDayMonthYear(TODAY), what: `Logged by caretaker via ${input.via}` }] },
      },
    });
  } catch (err) {
    // Lost the race to a concurrent retry that created the same clientId
    // first — that attempt's success is this attempt's success too.
    if (!isUniqueViolation(err, "clientId")) throw err;
  }

  // Deliberately not returned to the caller: a caretaker's newly logged
  // ticket does not appear on their own "My tickets" list or the landlord's
  // board until the next sync/load, matching the original prototype.
  return { ok: true };
}

export interface SubmitInspectionResult extends SubmitResult {
  row?: Inspection;
}

export async function submitInspectionAction(
  input: InspectFormState & { clientId: string }
): Promise<SubmitInspectionResult> {
  const session = await verifySession();
  const actor = actorFromSession(session);

  const label = input.unit.trim().toUpperCase();
  const unit = await prisma.unit.findUnique({ where: { label }, include: { property: true } });
  if (!unit) return { ok: false, reason: "Unit not found — check the unit number" };

  const toShape = (r: { ref: string; tenantLabelAtTime: string; photoCount: number }): Inspection => ({
    id: r.ref,
    unit: unit.label,
    property: unit.property.name,
    type: input.type,
    date: formatDayMonthYear(TODAY),
    tenant: r.tenantLabelAtTime,
    condition: input.condition,
    caretaker: session.user.name,
    photos: r.photoCount,
  });

  const existing = await prisma.inspection.findUnique({ where: { clientId: input.clientId } });
  if (existing) return { ok: true, row: toShape(existing) };

  // Tenant/Lease are RLS-protected — a caretaker outside this unit's
  // property assignment gets no row back and the inspection is logged
  // against "Vacant", rather than leaking who lives there.
  const lease = await withRlsContext(actor, (tx) =>
    tx.lease.findFirst({
      where: { unitId: unit.id, status: "ACTIVE" },
      select: { tenant: { select: { name: true } } },
    })
  );
  const tenantLabel = lease?.tenant.name ?? "Vacant";

  try {
    const count = await prisma.inspection.count();
    const ref = "IN-" + (90 + count);
    const row = await prisma.inspection.create({
      data: {
        ref,
        clientId: input.clientId,
        unitId: unit.id,
        type: INSPECTION_TYPE_VALUE[input.type],
        condition: INSPECTION_CONDITION_VALUE[input.condition],
        inspectedOn: TODAY,
        photoCount: input.photos,
        tenantLabelAtTime: tenantLabel,
        caretakerId: session.user.staffId,
        seedOrder: null,
      },
    });
    return { ok: true, row: toShape(row) };
  } catch (err) {
    if (!isUniqueViolation(err, "clientId")) throw err;
    // Lost the race to a concurrent retry — read back what it created.
    const raced = await prisma.inspection.findUnique({ where: { clientId: input.clientId } });
    return raced ? { ok: true, row: toShape(raced) } : { ok: false, reason: "Sync conflict — please retry" };
  }
}

export async function advanceTicketStatusAction(input: { ticketRef: string; status: TicketStatus }): Promise<void> {
  await verifySession();

  await prisma.maintenanceTicket.update({
    where: { ref: input.ticketRef },
    data: { status: TICKET_STATUS_VALUE[input.status] },
  });
}
