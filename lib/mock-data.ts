import type {
  ElectricityPurchase,
  Inspection,
  Levy,
  PropertyDef,
  StaffMember,
  Ticket,
  Unit,
} from "./types";

export const NAMES = [
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

export const PROPS: PropertyDef[] = [
  { id: "fh", name: "Fountainhof", prefix: "FH", count: 40, baseRent: 8400 },
  { id: "rv", name: "Rainbow View", prefix: "RV", count: 26, baseRent: 6900 },
  { id: "cc", name: "Concord", prefix: "CC", count: 26, baseRent: 6350 },
];

export const VACANT: Record<string, string> = {
  "FH-107": "14 Jul 2026",
  "FH-306": "02 Aug 2026",
  "RV-204": "21 Aug 2026",
};

export const NOTICE: Record<string, boolean> = {
  "CC-102": true,
  "FH-402": true,
};

export const CATS = ["Plumbing", "Electrical", "Appliance", "Doors & locks", "Pest", "Other"];

export const INSPECTIONS_BASE: Inspection[] = [
  { id: "IN-01", unit: "FH-107", property: "Fountainhof", type: "Move-out", date: "12 Jul 2026", tenant: "A. Botha", condition: "Damage noted", caretaker: "P. Nel", photos: 6 },
  { id: "IN-02", unit: "FH-107", property: "Fountainhof", type: "Move-in", date: "—", tenant: "Vacant", condition: "Pending", caretaker: "—", photos: 0 },
  { id: "IN-03", unit: "RV-204", property: "Rainbow View", type: "Move-out", date: "20 Aug 2026", tenant: "S. Mokoena", condition: "Good", caretaker: "J. Meyer", photos: 4 },
  { id: "IN-04", unit: "FH-306", property: "Fountainhof", type: "Move-out", date: "01 Aug 2026", tenant: "T. Nkosi", condition: "Fair", caretaker: "P. Nel", photos: 5 },
  { id: "IN-05", unit: "CC-102", property: "Concord", type: "Move-in", date: "03 Jun 2026", tenant: "M. Louw", condition: "Good", caretaker: "P. Nel", photos: 3 },
];

export const LEVIES_BASE: Levy[] = [
  { month: "Sep 2026", property: "Fountainhof", amount: 4200, note: "Body corporate — monthly" },
  { month: "Sep 2026", property: "Rainbow View", amount: 2600, note: "Body corporate — monthly" },
  { month: "Sep 2026", property: "Concord", amount: 1900, note: "Body corporate — monthly" },
  { month: "Aug 2026", property: "Fountainhof", amount: 4200, note: "Body corporate — monthly" },
  { month: "Aug 2026", property: "Rainbow View", amount: 2600, note: "Body corporate — monthly" },
  { month: "Aug 2026", property: "Concord", amount: 1900, note: "Body corporate — monthly" },
];

export const ELEC_PURCHASES_BASE: ElectricityPurchase[] = [
  { date: "28 Aug 2026", unit: "FH-204", token: "4213 8890 1147 0032", amount: 500, kwh: 264, recharge: false },
  { date: "27 Aug 2026", unit: "RV-108", token: "4213 8890 2210 7741", amount: 300, kwh: 158, recharge: true },
  { date: "26 Aug 2026", unit: "CC-205", token: "4213 8891 0034 8812", amount: 400, kwh: 211, recharge: false },
  { date: "24 Aug 2026", unit: "FH-311", token: "4213 8891 4471 0093", amount: 250, kwh: 132, recharge: true },
  { date: "22 Aug 2026", unit: "FH-102", token: "4213 8892 1180 5540", amount: 600, kwh: 214, recharge: false },
  { date: "21 Aug 2026", unit: "RV-203", token: "4213 8892 7788 1120", amount: 350, kwh: 184, recharge: true },
  { date: "19 Aug 2026", unit: "CC-101", token: "4213 8893 0091 4471", amount: 450, kwh: 237, recharge: false },
  { date: "18 Aug 2026", unit: "FH-401", token: "4213 8893 5512 8890", amount: 200, kwh: 105, recharge: true },
];

export const TICKETS: Ticket[] = [
  {
    id: "MR-2411", unit: "FH-204", title: "Geyser leaking into ceiling", status: "In progress", priority: "Urgent",
    via: "WhatsApp · P. Nel", meta: "Logged 31 Aug 07:12 · 3 photos",
    desc: "Water coming through the ceiling in the passage. Tenant switched the geyser off at the DB board.",
    photos: [{ label: "tenant photo" }, { label: "tenant photo" }, { label: "caretaker photo" }],
    timeline: [
      { when: "31 Aug 07:12", what: "Logged by P. Nel from a WhatsApp message" },
      { when: "31 Aug 07:40", what: "Landlord notified — marked urgent" },
      { when: "01 Sep 08:05", what: "Moved to In progress · plumber on site, 2 photos added" },
    ],
  },
  {
    id: "MR-2412", unit: "RV-108", title: "No power in bedroom sockets", status: "Logged", priority: "Emergency",
    via: "In person", meta: "Logged 02 Sep 06:48 · 1 photo",
    desc: "Bedroom plug points dead, rest of the unit fine. Tripped breaker resets then trips again.",
    photos: [{ label: "DB board" }],
    timeline: [
      { when: "02 Sep 06:48", what: "Logged in person at the gate by P. Nel" },
      { when: "02 Sep 06:49", what: "Emergency — landlord SMS sent" },
    ],
  },
  {
    id: "MR-2409", unit: "CC-205", title: "Blocked kitchen drain", status: "In progress", priority: "Routine",
    via: "WhatsApp", meta: "Logged 29 Aug · 2 photos", desc: "Sink draining very slowly, smell from the pipe.",
    photos: [{ label: "under sink" }, { label: "sink" }],
    timeline: [
      { when: "29 Aug 11:20", what: "Logged by P. Nel" },
      { when: "01 Sep 14:02", what: "Rodding attempted, needs a plumber" },
    ],
  },
  {
    id: "MR-2401", unit: "FH-311", title: "Front door lock sticking", status: "Resolved", priority: "Routine",
    via: "In person", meta: "Resolved 30 Aug · awaiting sign-off", desc: "Key turns but the latch catches.",
    photos: [{ label: "lock" }, { label: "after" }],
    timeline: [
      { when: "27 Aug", what: "Logged by P. Nel" },
      { when: "30 Aug", what: "Lock lubricated and strike plate adjusted — marked Resolved" },
    ],
  },
  {
    id: "MR-2388", unit: "FH-402", title: "Gate motor jamming", status: "Awaiting parts", priority: "Urgent",
    via: "Phone", meta: "Logged 21 Aug · part ordered", desc: "Sliding gate stops halfway, motor runs.",
    photos: [{ label: "motor" }],
    timeline: [
      { when: "21 Aug", what: "Logged by P. Nel" },
      { when: "23 Aug", what: "Technician: gearbox worn, part ordered" },
    ],
  },
];

export const STAFF: StaffMember[] = [
  { name: "M. Brandt", role: "Landlord", props: "All — Fountainhof, Rainbow View, Concord", canClose: "Yes · sole holder of deletion", active: "Now" },
  { name: "P. Nel", role: "Caretaker", props: "Fountainhof, Rainbow View, Concord", canClose: "No — marks Resolved for sign-off", active: "12 min ago" },
  { name: "J. Meyer", role: "Caretaker", props: "Concord only", canClose: "No", active: "Yesterday" },
];

export const TENANT_ELEC_HISTORY: { date: string; kwh: string; amount: number }[] = [
  { date: "28 Aug 2026", kwh: "264 kWh", amount: 500 },
  { date: "14 Aug 2026", kwh: "158 kWh", amount: 300 },
  { date: "02 Aug 2026", kwh: "211 kWh", amount: 400 },
  { date: "19 Jul 2026", kwh: "132 kWh", amount: 250 },
  { date: "06 Jul 2026", kwh: "214 kWh", amount: 400 },
  { date: "21 Jun 2026", kwh: "184 kWh", amount: 350 },
];

export function buildUnits(): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  PROPS.forEach((p, pi) => {
    for (let u = 1; u <= p.count; u++) {
      const floor = Math.ceil(u / 10);
      const label = p.prefix + "-" + (floor * 100 + ((u - 1) % 10) + 1);
      const seed = (i * 37 + pi * 11) % 100;
      const rent = p.baseRent + ((seed % 5) - 2) * 250;
      const vacant = !!VACANT[label];
      const notice = !!NOTICE[label];
      out.push({
        id: p.id + "-" + u,
        label,
        property: p.name,
        propertyId: p.id,
        rent,
        vacant,
        notice,
        vacantSince: VACANT[label] || null,
        tenant: vacant ? null : NAMES[i % NAMES.length],
        balance: vacant ? 0 : seed % 9 === 0 ? rent + (seed % 7) * 40 : 0,
        leaseEnd:
          (((seed * 3) % 12) + 1 < 10 ? "0" : "") +
          (((seed * 3) % 12) + 1) +
          "/" +
          ((seed * 3) % 12 < 8 ? 2027 : 2026),
        moveIn: "01/0" + ((seed % 9) + 1) + "/" + (2022 + (seed % 4)),
        phone: "+27 82 " + (100 + (seed % 800)) + " " + (1000 + ((seed * 7) % 9000)),
        meter: "04 " + (1200 + seed * 3) + " " + (4400 + seed * 7),
      });
      i++;
    }
  });
  return out;
}

export function formatR(n: number): string {
  const neg = n < 0;
  const s = "R " + Math.abs(Math.round(n)).toLocaleString("en-US");
  return neg ? "(" + s + ")" : s;
}

export function daysSince(d: string | null): number {
  if (!d) return 0;
  const parts = String(d).split(" ");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months.indexOf(parts[1]);
  const dt = new Date(2026, m, parseInt(parts[0], 10));
  return Math.max(0, Math.round((new Date(2026, 8, 2).getTime() - dt.getTime()) / 86400000));
}
