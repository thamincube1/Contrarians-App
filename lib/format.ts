// Pure display-formatting helpers shared by the server-side data mapping
// layer (lib/data.ts) and, previously, the mock data generator. Kept
// framework-agnostic so both server and client code can import them.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatR(n: number): string {
  const neg = n < 0;
  const s = "R " + Math.abs(Math.round(n)).toLocaleString("en-US");
  return neg ? "(" + s + ")" : s;
}

/** Days between the fixed in-app "today" (2 Sep 2026) and a "DD Mon YYYY" date string. */
export function daysSince(d: string | null): number {
  if (!d) return 0;
  const parts = String(d).split(" ");
  const m = MONTHS.indexOf(parts[1]);
  const dt = new Date(2026, m, parseInt(parts[0], 10));
  return Math.max(0, Math.round((new Date(2026, 8, 2).getTime() - dt.getTime()) / 86400000));
}

/** "DD Mon YYYY", e.g. "28 Aug 2026" — matches the electricity ledger's date format. */
export function formatDayMonthYear(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mon YYYY", e.g. "Sep 2026" — matches the levy ledger's month format. */
export function formatMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "MM/YYYY", e.g. "09/2026" — matches the lease-end format. */
export function formatMonthSlashYear(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** "DD/MM/YYYY", e.g. "01/03/2023" — matches the move-in date format. */
export function formatDateSlash(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
