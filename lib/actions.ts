"use server";

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

export async function submitTicketAction(input: RepairFormState): Promise<void> {
  await verifySession();

  const unit = await prisma.unit.findUnique({ where: { label: input.unit.trim().toUpperCase() } });
  if (!unit) return;

  const count = await prisma.maintenanceTicket.count();
  const ref = "MR-" + (2414 + count);
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

  await prisma.maintenanceTicket.create({
    data: {
      ref,
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
  // Deliberately not returned to the caller: a caretaker's newly logged
  // ticket does not appear on their own "My tickets" list or the landlord's
  // board until the next sync/load, matching the original prototype.
}

export async function submitInspectionAction(input: InspectFormState): Promise<Inspection | null> {
  const session = await verifySession();
  const actor = actorFromSession(session);

  const label = input.unit.trim().toUpperCase();
  const unit = await prisma.unit.findUnique({ where: { label }, include: { property: true } });
  if (!unit) return null;

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

  const count = await prisma.inspection.count();
  const ref = "IN-" + (90 + count);

  const row = await prisma.inspection.create({
    data: {
      ref,
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

  return {
    id: row.ref,
    unit: unit.label,
    property: unit.property.name,
    type: input.type,
    date: formatDayMonthYear(TODAY),
    tenant: tenantLabel,
    condition: input.condition,
    caretaker: session.user.name,
    photos: input.photos,
  };
}

export async function advanceTicketStatusAction(input: { ticketRef: string; status: TicketStatus }): Promise<void> {
  await verifySession();

  await prisma.maintenanceTicket.update({
    where: { ref: input.ticketRef },
    data: { status: TICKET_STATUS_VALUE[input.status] },
  });
}
