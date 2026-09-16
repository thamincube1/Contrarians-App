"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { withRlsContext } from "./prisma-rls";
import { verifySession, actorFromSession } from "./dal";
import { formatDateSlash, formatDayMonthYear, formatMonthSlashYear, formatMonthYear } from "./format";
import {
  INSPECTION_CONDITION_LABEL,
  INSPECTION_CONDITION_VALUE,
  INSPECTION_TYPE_VALUE,
  TICKET_STATUS_VALUE,
} from "./data";
import { renderPdfToBuffer } from "./pdf/render";
import { StatementDocument, type StatementData } from "./pdf/StatementDocument";
import { InvoiceDocument, type InvoiceData, type InvoiceLineItem } from "./pdf/InvoiceDocument";
import { ArchiveDocument, type ArchiveData } from "./pdf/ArchiveDocument";
import { sendEmailWithAttachment } from "./email";
import { storeArchivePdf } from "./storage";
import type {
  ElectricityPurchase as ElectricityPurchaseShape,
  Inspection,
  InspectFormState,
  Levy,
  RepairFormState,
  TicketStatus,
} from "./types";

const TODAY = new Date(2026, 8, 2); // the app's fixed in-story "today"
// Mirrors lib/store.tsx's GRACE_DAYS/LATE_FEE — duplicated rather than
// imported because that module is client-only ("use client") and these
// values are needed here for the letter-of-demand PDF's wording.
const GRACE_DAYS = 5;
const LATE_FEE = 250;

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

// ---- Tenant record: payment, statement, invoice, demand, offboarding ----

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

/** Fetches everything the statement/demand PDF needs for one unit's active lease. */
async function gatherStatementData(
  tx: Prisma.TransactionClient,
  unitId: string
): Promise<{
  lease: Prisma.LeaseGetPayload<{ include: { tenant: true; unit: { include: { property: true } } } }>;
  statementData: StatementData;
} | null> {
  const lease = await tx.lease.findFirst({
    where: { unitId, status: "ACTIVE" },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      payments: { orderBy: { paidAt: "desc" }, take: 12 },
    },
  });
  if (!lease) return null;

  const statementData: StatementData = {
    tenantName: lease.tenant.name,
    unitLabel: lease.unit.label,
    propertyName: lease.unit.property.name,
    phone: lease.tenant.phone,
    generatedOn: formatDayMonthYear(TODAY),
    moveIn: formatDateSlash(lease.moveInDate),
    leaseEnd: formatMonthSlashYear(lease.leaseEndDate),
    monthlyRent: lease.monthlyRent,
    depositHeld: lease.depositHeld,
    balance: lease.balance,
    graceDays: GRACE_DAYS,
    lateFee: LATE_FEE,
    payments: lease.payments.map((p) => ({ date: formatDayMonthYear(p.paidAt), amount: p.amount })),
  };

  return { lease, statementData };
}

export interface EmailActionResult {
  /** False only when the underlying business action itself didn't happen (e.g. no active lease). */
  ok: boolean;
  /** True once the PDF was actually sent — via Resend, or logged in dev mode. */
  emailed: boolean;
  devMode?: boolean;
  reason?: string;
}

async function deliverPdf(input: {
  to: string | null;
  subject: string;
  html: string;
  filename: string;
  pdf: Buffer;
}): Promise<{ emailed: boolean; devMode?: boolean; reason?: string }> {
  if (!input.to) return { emailed: false, reason: "No email on file for this tenant" };

  const result = await sendEmailWithAttachment({
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachment: { filename: input.filename, content: input.pdf },
  });
  if (!result.ok) return { emailed: false, reason: result.error ?? "Failed to send email" };
  return { emailed: true, devMode: result.devMode };
}

export async function sendStatementAction(input: { unitId: string }): Promise<EmailActionResult> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return { ok: false, emailed: false, reason: "Not authorized" };
  const actor = actorFromSession(session);

  const gathered = await withRlsContext(actor, (tx) => gatherStatementData(tx, input.unitId));
  if (!gathered) return { ok: false, emailed: false, reason: "No active lease found for this unit" };
  const { lease, statementData } = gathered;

  const pdf = await renderPdfToBuffer(<StatementDocument data={statementData} />);
  const delivery = await deliverPdf({
    to: lease.tenant.email,
    subject: `Statement — ${statementData.unitLabel}, ${statementData.propertyName}`,
    html: `<p>Hi ${statementData.tenantName},</p><p>Your latest statement is attached.</p>`,
    filename: `statement-${statementData.unitLabel}.pdf`,
    pdf,
  });

  return { ok: true, ...delivery };
}

export async function sendInvoiceAction(input: { unitId: string }): Promise<EmailActionResult> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return { ok: false, emailed: false, reason: "Not authorized" };
  const actor = actorFromSession(session);

  const lease = await withRlsContext(actor, (tx) =>
    tx.lease.findFirst({
      where: { unitId: input.unitId, status: "ACTIVE" },
      include: { tenant: true, unit: { include: { property: true } } },
    })
  );
  if (!lease) return { ok: false, emailed: false, reason: "No active lease found for this unit" };

  const lineItems: InvoiceLineItem[] = [{ label: "Monthly rent", amount: lease.monthlyRent }];
  if (lease.balance > lease.monthlyRent) {
    lineItems.push({ label: "Arrears carried forward", amount: lease.balance - lease.monthlyRent });
  }
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const invoiceData: InvoiceData = {
    invoiceNumber: `INV-${lease.unit.label}-${TODAY.getFullYear()}${String(TODAY.getMonth() + 1).padStart(2, "0")}`,
    tenantName: lease.tenant.name,
    unitLabel: lease.unit.label,
    propertyName: lease.unit.property.name,
    billingMonth: formatMonthYear(TODAY),
    issueDate: formatDayMonthYear(TODAY),
    dueDate: formatDayMonthYear(new Date(TODAY.getTime() + GRACE_DAYS * 86400000)),
    lineItems,
    total,
  };

  const pdf = await renderPdfToBuffer(<InvoiceDocument data={invoiceData} />);
  const delivery = await deliverPdf({
    to: lease.tenant.email,
    subject: `Invoice ${invoiceData.invoiceNumber} — ${invoiceData.unitLabel}`,
    html: `<p>Hi ${invoiceData.tenantName},</p><p>Your invoice for ${invoiceData.billingMonth} is attached.</p>`,
    filename: `${invoiceData.invoiceNumber}.pdf`,
    pdf,
  });

  return { ok: true, ...delivery };
}

export async function sendDemandAction(input: { unitId: string }): Promise<EmailActionResult> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return { ok: false, emailed: false, reason: "Not authorized" };
  const actor = actorFromSession(session);

  const gathered = await withRlsContext(actor, async (tx) => {
    const g = await gatherStatementData(tx, input.unitId);
    if (!g || g.lease.balance <= 0) return null;
    await tx.lease.update({ where: { id: g.lease.id }, data: { demandSent: true } });
    return g;
  });
  if (!gathered) return { ok: false, emailed: false, reason: "No overdue balance — nothing to send" };
  const { lease, statementData } = gathered;

  const pdf = await renderPdfToBuffer(<StatementDocument data={statementData} variant="demand" />);
  const delivery = await deliverPdf({
    to: lease.tenant.email,
    subject: `Letter of demand — ${statementData.unitLabel}, ${statementData.propertyName}`,
    html: `<p>Dear ${statementData.tenantName},</p><p>Please find attached a formal letter of demand regarding your account.</p>`,
    filename: `demand-${statementData.unitLabel}.pdf`,
    pdf,
  });

  return { ok: true, ...delivery };
}

export async function confirmOffboardAction(input: {
  unitId: string;
  purgeMode: "anonymise" | "hard";
}): Promise<{ tenantName: string; unitLabel: string } | null> {
  const session = await verifySession();
  if (session.user.role !== "LANDLORD") return null;
  const actor = actorFromSession(session);

  const prepared = await withRlsContext(actor, async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { unitId: input.unitId, status: "ACTIVE" },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        payments: { orderBy: { paidAt: "desc" } },
      },
    });
    if (!lease) return null;

    const tenantName = lease.tenant.name;
    const unitLabel = lease.unit.label;

    // Inspection isn't RLS-protected, so this is a plain read through the
    // same transaction connection — captured before the tenant/lease rows
    // below are mutated, so the archive reflects the move-out condition as
    // it stood at the moment of offboarding.
    const moveOutInspection = await tx.inspection.findFirst({
      where: { unitId: input.unitId, type: "MOVE_OUT" },
      orderBy: { createdAt: "desc" },
      include: { checklistItems: true },
    });

    const offboarding = await tx.tenantOffboarding.create({
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

    const archiveData: ArchiveData = {
      tenantName: lease.tenant.name,
      phone: lease.tenant.phone,
      unitLabel: lease.unit.label,
      propertyName: lease.unit.property.name,
      moveIn: formatDateSlash(lease.moveInDate),
      leaseEnd: formatMonthSlashYear(lease.leaseEndDate),
      monthlyRent: lease.monthlyRent,
      depositHeld: lease.depositHeld,
      finalBalance: lease.balance,
      purgeMode: input.purgeMode,
      performedOn: formatDayMonthYear(TODAY),
      // Always the full history, even on a hard purge — this PDF is the
      // one place that history survives once the Payment rows are gone.
      payments: lease.payments.map((p) => ({ date: formatDayMonthYear(p.paidAt), amount: p.amount })),
      moveOutInspection: moveOutInspection
        ? {
            ref: moveOutInspection.ref,
            condition: INSPECTION_CONDITION_LABEL[moveOutInspection.condition],
            inspectedOn: moveOutInspection.inspectedOn ? formatDayMonthYear(moveOutInspection.inspectedOn) : "—",
            photoCount: moveOutInspection.photoCount,
            checklist: moveOutInspection.checklistItems.map((c) => ({ label: c.label, ok: c.ok, note: c.note })),
          }
        : null,
    };

    return { tenantName, unitLabel, offboardingId: offboarding.id, archiveData };
  });

  if (!prepared) return null;
  const { tenantName, unitLabel, offboardingId, archiveData } = prepared;

  // PDF rendering, disk storage and email are all I/O-bound with no need
  // to hold the RLS transaction open for them — done after it commits.
  const pdf = await renderPdfToBuffer(<ArchiveDocument data={archiveData} />);
  const filename = `offboarding-${unitLabel}-${offboardingId}.pdf`;
  const archiveUrl = await storeArchivePdf(filename, pdf);

  await withRlsContext(actor, (tx) => tx.tenantOffboarding.update({ where: { id: offboardingId }, data: { archiveUrl } }));

  const emailResult = await sendEmailWithAttachment({
    to: session.user.email,
    subject: `Offboarding archive — ${tenantName}, ${unitLabel}`,
    html: `<p>The offboarding archive for ${tenantName} (${unitLabel}) is attached for your records.</p>`,
    attachment: { filename, content: pdf },
  });
  if (!emailResult.ok) {
    console.error(`Offboarding archive email failed for ${unitLabel}:`, emailResult.error);
  }

  return { tenantName, unitLabel };
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
