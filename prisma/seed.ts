// Seeds the database with the exact dataset the app used to generate in
// memory (see the retired lib/mock-data.ts), so the UI looks identical
// after switching from mock state to Postgres.

import { PrismaClient, ReportedVia, TicketPriority, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();

const NAMES = [
  "A. Botha", "S. Mokoena", "T. Nkosi", "M. Louw", "P. Dlamini", "J. Steenkamp",
  "L. Mahlangu", "R. van Wyk", "C. Sithole", "D. Coetzee", "N. Maseko", "F. Pillay",
  "B. Mthembu", "E. Titus", "G. Khumalo", "H. Swartbooi", "I. Naidoo", "K. du Plessis",
  "O. Tshabalala", "Q. Jacobs", "S. Radebe", "V. Ndlovu", "W. Basson", "Y. Zulu",
  "Z. Mabaso", "A. Hendricks", "B. Nkomo", "C. Erasmus", "D. Kekana", "E. Mbeki",
  "F. Naicker", "G. Sibiya", "H. September", "I. Molefe", "J. Mokwena", "K. Gumede",
  "L. Schoeman", "M. Adams", "N. Baloyi", "O. Simelane", "P. Nkabinde", "Q. Twala",
  "R. Kruger", "S. Kapa", "T. Ndaba", "U. Shange", "V. Cele", "W. Engelbrecht",
  "X. Nomvete", "Y. Kani", "Z. Kativu", "A. Ncube", "B. Sithebe", "C. Isaacs",
  "D. Mashaba", "E. Kandji", "F. Hendriks", "G. Amos", "H. Angula", "I. Tswane",
];

const PROPS = [
  { key: "fh", name: "Fountainhof", prefix: "FH", count: 40, baseRent: 8400 },
  { key: "rv", name: "Rainbow View", prefix: "RV", count: 26, baseRent: 6900 },
  { key: "cc", name: "Concord", prefix: "CC", count: 26, baseRent: 6350 },
];

// label -> "DD Mon YYYY" vacant-since date
const VACANT: Record<string, string> = {
  "FH-107": "14 Jul 2026",
  "FH-306": "02 Aug 2026",
  "RV-204": "21 Aug 2026",
};

const NOTICE: Record<string, boolean> = {
  "CC-102": true,
  "FH-402": true,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDayMonthYear(s: string): Date {
  const [day, mon, year] = s.split(" ");
  return new Date(Number(year), MONTHS.indexOf(mon), Number(day));
}

async function main() {
  console.log("Seeding…");

  // ---- Properties ----
  const propertyByKey = new Map<string, { id: string; name: string }>();
  for (const p of PROPS) {
    const row = await prisma.property.create({
      data: { key: p.key, name: p.name, prefix: p.prefix, baseRent: p.baseRent },
    });
    propertyByKey.set(p.key, row);
  }

  // ---- Units, tenants & leases (mirrors the old buildUnits() formula) ----
  const unitIdByLabel = new Map<string, string>();
  let i = 0;
  for (const p of PROPS) {
    const property = propertyByKey.get(p.key)!;
    for (let u = 1; u <= p.count; u++) {
      const floor = Math.ceil(u / 10);
      const label = p.prefix + "-" + (floor * 100 + ((u - 1) % 10) + 1);
      const seed = (i * 37 + PROPS.indexOf(p) * 11) % 100;
      const rent = p.baseRent + ((seed % 5) - 2) * 250;
      const vacant = !!VACANT[label];
      const notice = !!NOTICE[label];

      const unit = await prisma.unit.create({
        data: {
          label,
          propertyId: property.id,
          rent,
          status: vacant ? "VACANT" : notice ? "NOTICE" : "OCCUPIED",
          vacantSince: VACANT[label] ? parseDayMonthYear(VACANT[label]) : null,
          meterNumber: "04 " + (1200 + seed * 3) + " " + (4400 + seed * 7),
        },
      });
      unitIdByLabel.set(label, unit.id);

      if (!vacant) {
        const tenantName = NAMES[i % NAMES.length];
        const balance = seed % 9 === 0 ? rent + (seed % 7) * 40 : 0;
        const leaseEndMonth = ((seed * 3) % 12) + 1;
        const leaseEndYear = (seed * 3) % 12 < 8 ? 2027 : 2026;
        const moveInMonth = (seed % 9) + 1;
        const moveInYear = 2022 + (seed % 4);
        const phone = "+27 82 " + (100 + (seed % 800)) + " " + (1000 + ((seed * 7) % 9000));

        const tenant = await prisma.tenant.create({
          data: { name: tenantName, phone, status: "ACTIVE" },
        });
        await prisma.lease.create({
          data: {
            unitId: unit.id,
            tenantId: tenant.id,
            status: "ACTIVE",
            moveInDate: new Date(moveInYear, moveInMonth - 1, 1),
            leaseEndDate: new Date(leaseEndYear, leaseEndMonth - 1, 1),
            monthlyRent: rent,
            depositHeld: rent,
            balance,
          },
        });
      }
      i++;
    }
  }

  // ---- Staff ----
  const brandt = await prisma.staffMember.create({
    data: {
      name: "M. Brandt",
      role: "LANDLORD",
      canCloseTickets: true,
      canCloseLabel: "Yes · sole holder of deletion",
      lastActiveLabel: "Now",
      lastActiveAt: new Date(),
    },
  });
  const nel = await prisma.staffMember.create({
    data: {
      name: "P. Nel",
      role: "CARETAKER",
      canCloseTickets: false,
      canCloseLabel: "No — marks Resolved for sign-off",
      lastActiveLabel: "12 min ago",
      lastActiveAt: new Date(Date.now() - 12 * 60 * 1000),
    },
  });
  const meyer = await prisma.staffMember.create({
    data: {
      name: "J. Meyer",
      role: "CARETAKER",
      canCloseTickets: false,
      canCloseLabel: "No",
      lastActiveLabel: "Yesterday",
      lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  const allPropertyIds = [...propertyByKey.values()].map((p) => p.id);
  for (const propId of allPropertyIds) {
    await prisma.staffPropertyAssignment.create({ data: { staffId: brandt.id, propertyId: propId } });
    await prisma.staffPropertyAssignment.create({ data: { staffId: nel.id, propertyId: propId } });
  }
  await prisma.staffPropertyAssignment.create({
    data: { staffId: meyer.id, propertyId: propertyByKey.get("cc")!.id },
  });

  // ---- Maintenance tickets ----
  const TICKETS = [
    {
      ref: "MR-2411", unit: "FH-204", title: "Geyser leaking into ceiling",
      status: TicketStatus.IN_PROGRESS, priority: TicketPriority.URGENT,
      reportedVia: ReportedVia.WHATSAPP, viaLabel: "WhatsApp · P. Nel",
      metaLabel: "Logged 31 Aug 07:12 · 3 photos", loggedAt: new Date(2026, 7, 31, 7, 12),
      description: "Water coming through the ceiling in the passage. Tenant switched the geyser off at the DB board.",
      photos: ["tenant photo", "tenant photo", "caretaker photo"],
      events: [
        { whenLabel: "31 Aug 07:12", what: "Logged by P. Nel from a WhatsApp message" },
        { whenLabel: "31 Aug 07:40", what: "Landlord notified — marked urgent" },
        { whenLabel: "01 Sep 08:05", what: "Moved to In progress · plumber on site, 2 photos added" },
      ],
    },
    {
      ref: "MR-2412", unit: "RV-108", title: "No power in bedroom sockets",
      status: TicketStatus.LOGGED, priority: TicketPriority.EMERGENCY,
      reportedVia: ReportedVia.IN_PERSON, viaLabel: "In person",
      metaLabel: "Logged 02 Sep 06:48 · 1 photo", loggedAt: new Date(2026, 8, 2, 6, 48),
      description: "Bedroom plug points dead, rest of the unit fine. Tripped breaker resets then trips again.",
      photos: ["DB board"],
      events: [
        { whenLabel: "02 Sep 06:48", what: "Logged in person at the gate by P. Nel" },
        { whenLabel: "02 Sep 06:49", what: "Emergency — landlord SMS sent" },
      ],
    },
    {
      ref: "MR-2409", unit: "CC-205", title: "Blocked kitchen drain",
      status: TicketStatus.IN_PROGRESS, priority: TicketPriority.ROUTINE,
      reportedVia: ReportedVia.WHATSAPP, viaLabel: "WhatsApp",
      metaLabel: "Logged 29 Aug · 2 photos", loggedAt: new Date(2026, 7, 29, 11, 20),
      description: "Sink draining very slowly, smell from the pipe.",
      photos: ["under sink", "sink"],
      events: [
        { whenLabel: "29 Aug 11:20", what: "Logged by P. Nel" },
        { whenLabel: "01 Sep 14:02", what: "Rodding attempted, needs a plumber" },
      ],
    },
    {
      ref: "MR-2401", unit: "FH-310", title: "Front door lock sticking",
      status: TicketStatus.RESOLVED, priority: TicketPriority.ROUTINE,
      reportedVia: ReportedVia.IN_PERSON, viaLabel: "In person",
      metaLabel: "Resolved 30 Aug · awaiting sign-off", loggedAt: new Date(2026, 7, 27),
      description: "Key turns but the latch catches.",
      photos: ["lock", "after"],
      events: [
        { whenLabel: "27 Aug", what: "Logged by P. Nel" },
        { whenLabel: "30 Aug", what: "Lock lubricated and strike plate adjusted — marked Resolved" },
      ],
    },
    {
      ref: "MR-2388", unit: "FH-402", title: "Gate motor jamming",
      status: TicketStatus.AWAITING_PARTS, priority: TicketPriority.URGENT,
      reportedVia: ReportedVia.PHONE, viaLabel: "Phone",
      metaLabel: "Logged 21 Aug · part ordered", loggedAt: new Date(2026, 7, 21),
      description: "Sliding gate stops halfway, motor runs.",
      photos: ["motor"],
      events: [
        { whenLabel: "21 Aug", what: "Logged by P. Nel" },
        { whenLabel: "23 Aug", what: "Technician: gearbox worn, part ordered" },
      ],
    },
  ];

  for (const t of TICKETS) {
    await prisma.maintenanceTicket.create({
      data: {
        ref: t.ref,
        unitId: unitIdByLabel.get(t.unit)!,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        reportedVia: t.reportedVia,
        viaLabel: t.viaLabel,
        metaLabel: t.metaLabel,
        loggedAt: t.loggedAt,
        assigneeId: nel.id,
        photos: { create: t.photos.map((label) => ({ label })) },
        events: { create: t.events },
      },
    });
  }

  // ---- Inspections ----
  const INSPECTIONS = [
    { ref: "IN-01", unit: "FH-107", type: "MOVE_OUT", date: "12 Jul 2026", tenant: "A. Botha", condition: "DAMAGE_NOTED", caretaker: nel.id, photos: 6 },
    { ref: "IN-02", unit: "FH-107", type: "MOVE_IN", date: null, tenant: "Vacant", condition: "PENDING", caretaker: null, photos: 0 },
    { ref: "IN-03", unit: "RV-204", type: "MOVE_OUT", date: "20 Aug 2026", tenant: "S. Mokoena", condition: "GOOD", caretaker: meyer.id, photos: 4 },
    { ref: "IN-04", unit: "FH-306", type: "MOVE_OUT", date: "01 Aug 2026", tenant: "T. Nkosi", condition: "FAIR", caretaker: nel.id, photos: 5 },
    { ref: "IN-05", unit: "CC-102", type: "MOVE_IN", date: "03 Jun 2026", tenant: "M. Louw", condition: "GOOD", caretaker: nel.id, photos: 3 },
  ] as const;

  for (const [seedOrder, insp] of INSPECTIONS.entries()) {
    const checklistItems =
      insp.condition === "PENDING"
        ? []
        : [
            { label: "Walls & paintwork", ok: insp.condition !== "DAMAGE_NOTED" },
            { label: "Fixtures & fittings", ok: insp.condition === "GOOD" },
            {
              label: "Electricity meter reading",
              ok: true,
              note: insp.condition === "DAMAGE_NOTED" ? "Recorded; damage unrelated to meter" : null,
            },
          ];
    await prisma.inspection.create({
      data: {
        ref: insp.ref,
        unitId: unitIdByLabel.get(insp.unit)!,
        type: insp.type,
        condition: insp.condition,
        inspectedOn: insp.date ? parseDayMonthYear(insp.date) : null,
        caretakerId: insp.caretaker,
        photoCount: insp.photos,
        tenantLabelAtTime: insp.tenant,
        seedOrder,
        checklistItems: { create: checklistItems },
      },
    });
  }

  // ---- Levies ----
  const LEVIES: { propertyKey: string; period: Date; amount: number; note: string }[] = [
    { propertyKey: "fh", period: new Date(2026, 8, 1), amount: 4200, note: "Body corporate — monthly" },
    { propertyKey: "rv", period: new Date(2026, 8, 1), amount: 2600, note: "Body corporate — monthly" },
    { propertyKey: "cc", period: new Date(2026, 8, 1), amount: 1900, note: "Body corporate — monthly" },
    { propertyKey: "fh", period: new Date(2026, 7, 1), amount: 4200, note: "Body corporate — monthly" },
    { propertyKey: "rv", period: new Date(2026, 7, 1), amount: 2600, note: "Body corporate — monthly" },
    { propertyKey: "cc", period: new Date(2026, 7, 1), amount: 1900, note: "Body corporate — monthly" },
  ];
  for (const [seedOrder, l] of LEVIES.entries()) {
    await prisma.levy.create({
      data: {
        propertyId: propertyByKey.get(l.propertyKey)!.id,
        period: l.period,
        amount: l.amount,
        note: l.note,
        seedOrder,
      },
    });
  }

  // ---- Electricity purchases ----
  const ELEC: { date: string; unit: string; token: string; amount: number; kwh: number; recharge: boolean }[] = [
    { date: "28 Aug 2026", unit: "FH-204", token: "4213 8890 1147 0032", amount: 500, kwh: 264, recharge: false },
    { date: "27 Aug 2026", unit: "RV-108", token: "4213 8890 2210 7741", amount: 300, kwh: 158, recharge: true },
    { date: "26 Aug 2026", unit: "CC-205", token: "4213 8891 0034 8812", amount: 400, kwh: 211, recharge: false },
    { date: "24 Aug 2026", unit: "FH-310", token: "4213 8891 4471 0093", amount: 250, kwh: 132, recharge: true },
    { date: "22 Aug 2026", unit: "FH-102", token: "4213 8892 1180 5540", amount: 600, kwh: 214, recharge: false },
    { date: "21 Aug 2026", unit: "RV-203", token: "4213 8892 7788 1120", amount: 350, kwh: 184, recharge: true },
    { date: "19 Aug 2026", unit: "CC-101", token: "4213 8893 0091 4471", amount: 450, kwh: 237, recharge: false },
    { date: "18 Aug 2026", unit: "FH-401", token: "4213 8893 5512 8890", amount: 200, kwh: 105, recharge: true },
  ];
  for (const [seedOrder, e] of ELEC.entries()) {
    await prisma.electricityPurchase.create({
      data: {
        unitId: unitIdByLabel.get(e.unit)!,
        purchasedOn: parseDayMonthYear(e.date),
        amount: e.amount,
        kwh: e.kwh,
        token: e.token,
        recharge: e.recharge,
        seedOrder,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
