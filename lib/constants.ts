// Pure UI constants — not backed by the database.

export const CATS = ["Plumbing", "Electrical", "Appliance", "Doors & locks", "Pest", "Other"];

// The tenant record's "last 6 purchases" panel is a fixed prototype
// illustration in the original design (it does not vary per tenant); kept
// verbatim so the screen renders identically after the data-layer swap.
export const TENANT_ELEC_HISTORY: { date: string; kwh: string; amount: number }[] = [
  { date: "28 Aug 2026", kwh: "264 kWh", amount: 500 },
  { date: "14 Aug 2026", kwh: "158 kWh", amount: 300 },
  { date: "02 Aug 2026", kwh: "211 kWh", amount: 400 },
  { date: "19 Jul 2026", kwh: "132 kWh", amount: 250 },
  { date: "06 Jul 2026", kwh: "214 kWh", amount: 400 },
  { date: "21 Jun 2026", kwh: "184 kWh", amount: 350 },
];
