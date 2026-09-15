"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  advanceTicketStatusAction,
  confirmOffboardAction,
  saveElectricityPurchaseAction,
  saveLevyAction,
  savePaymentAction,
  sendDemandAction,
  submitInspectionAction,
  submitTicketAction,
} from "./actions";
import { CATS, TENANT_ELEC_HISTORY } from "./constants";
import type { InitialData } from "./data";
import { daysSince, formatR } from "./format";
import type {
  CaretakerScreen,
  ElecFormState,
  ElectricityPurchase,
  Inspection,
  InspectFormState,
  LandlordScreen,
  Levy,
  LevyFormState,
  PropertyDef,
  PurgeMode,
  RepairFormState,
  Role,
  StaffMember,
  Ticket,
  TicketStatus,
  Unit,
} from "./types";

const GRACE_DAYS = 5;
const LATE_FEE = 250;
const TODAY_LABEL = "02 Sep 2026";

// ---- live module-level exports ----
// Dashboard.tsx, Levies.tsx, Electricity.tsx and Staff.tsx import PROPS /
// ELEC_PURCHASES_BASE / STAFF directly (module scope, not through a hook),
// mirroring how the original mock module worked. AppProvider populates
// these arrays in place from the server-fetched initial data on mount, so
// the same import keeps working unchanged now that the values are DB-backed.
// None of the three ever change after the initial load (no write action in
// this app adds a property, hires staff, or edits the electricity fixtures),
// so a one-time in-place fill is all they need.
export const PROPS: PropertyDef[] = [];
export const STAFF: StaffMember[] = [];
export const ELEC_PURCHASES_BASE: ElectricityPurchase[] = [];

function fillOnce<T>(target: T[], source: T[]) {
  if (target.length === 0 && source.length > 0) target.push(...source);
}

interface AppState {
  role: Role;
  screen: LandlordScreen;
  tenantId: string | null;
  query: string;
  filter: string;
  payOpen: boolean;
  payAmount: string;
  offboardOpen: boolean;
  purge: PurgeMode;
  confirm: string;
  demandSent: Record<string, boolean>;
  elec: ElecFormState;
  elecExtra: ElectricityPurchase[];
  inspect: InspectFormState;
  inspectExtra: Inspection[];
  levy: LevyFormState;
  levyExtra: Levy[];
  ct: CaretakerScreen;
  ticketId: string;
  offline: boolean;
  toast: string;
  form: RepairFormState;
}

function buildInitialState(initial: InitialData): AppState {
  return {
    role: "landlord",
    screen: "dashboard",
    tenantId: null,
    query: "",
    filter: "All units",
    payOpen: false,
    payAmount: "",
    offboardOpen: false,
    purge: "anonymise",
    confirm: "",
    demandSent: {},
    elec: { unit: "FH-204", amount: "400", kwh: "212", token: "", recharge: true },
    elecExtra: initial.electricityExtra,
    inspect: { unit: "", type: "Move-in", condition: "Good", notes: "", photos: 1 },
    inspectExtra: initial.inspectionsExtra,
    levy: { property: "fh", amount: "", note: "" },
    levyExtra: initial.leviesExtra,
    ct: "home",
    ticketId: initial.tickets[0]?.id ?? "",
    offline: false,
    toast: "",
    form: { unit: "", cat: "Plumbing", desc: "", urgency: "Routine", via: "WhatsApp", photos: 1 },
  };
}

interface AppContextValue {
  state: AppState;
  units: Unit[];
  tickets: Ticket[];
  inspectionsBase: Inspection[];
  leviesBase: Levy[];
  R: (n: number) => string;
  flash: (m: string) => void;
  setRole: (r: Role) => void;
  goScreen: (s: LandlordScreen) => void;
  setQuery: (q: string) => void;
  setFilter: (f: string) => void;
  openTenant: (unitId: string) => void;

  setElecField: (patch: Partial<ElecFormState>) => void;
  saveElec: () => void;

  setLevyField: (patch: Partial<LevyFormState>) => void;
  saveLevy: () => void;

  openPayment: () => void;
  closePayment: () => void;
  setPayAmount: (v: string) => void;
  savePayment: () => void;
  sendDemand: () => void;

  openOffboard: () => void;
  closeOffboard: () => void;
  setPurge: (m: PurgeMode) => void;
  setConfirm: (v: string) => void;
  confirmOffboard: () => void;

  ctNew: () => void;
  ctNewInspect: () => void;
  ctBack: () => void;
  openTicket: (id: string) => void;
  toggleOffline: () => void;
  setFormField: (patch: Partial<RepairFormState>) => void;
  addPhoto: () => void;
  submitTicket: () => void;
  setInspectField: (patch: Partial<InspectFormState>) => void;
  addInspectPhoto: () => void;
  submitInspection: () => void;
  advanceStatus: (ticketId: string, status: TicketStatus) => void;

  stubbed: (label: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, initial }: { children: ReactNode; initial: InitialData }) {
  fillOnce(PROPS, initial.properties);
  fillOnce(STAFF, initial.staff);
  fillOnce(ELEC_PURCHASES_BASE, initial.electricityBase);

  const [state, setState] = useState<AppState>(() => buildInitialState(initial));
  const [units, setUnits] = useState<Unit[]>(initial.units);
  const [tickets, setTickets] = useState<Ticket[]>(initial.tickets);
  // Fixed fixtures — no write action in this app edits or removes them.
  const [inspectionsBase] = useState(initial.inspectionsBase);
  const [leviesBase] = useState(initial.leviesBase);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((p: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
    setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
  }, []);

  const flash = useCallback((m: string) => {
    setState((s) => ({ ...s, toast: m }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: "" })), 3000);
  }, []);

  const R = formatR;

  const value: AppContextValue = useMemo(() => {
    const t = selectedTenant(state, units);
    const bal = t ? t.balance : 0;

    return {
      state,
      units,
      tickets,
      inspectionsBase,
      leviesBase,
      R,
      flash,
      setRole: (r) => patch({ role: r }),
      goScreen: (screenId) => patch({ screen: screenId }),
      setQuery: (q) => patch({ query: q }),
      setFilter: (f) => patch({ filter: f }),
      openTenant: (unitId) => patch({ screen: "tenant", tenantId: unitId }),

      setElecField: (p) => patch((s) => ({ elec: { ...s.elec, ...p } })),
      saveElec: () => {
        const a = parseFloat(state.elec.amount) || 0;
        const k = parseFloat(state.elec.kwh) || 0;
        if (!a || !k) {
          flash("Amount and kWh are required");
          return;
        }
        const unitLabel = state.elec.unit;
        void (async () => {
          const row = await saveElectricityPurchaseAction({
            unitLabel,
            amount: a,
            kwh: k,
            token: state.elec.token,
            recharge: state.elec.recharge,
          });
          if (!row) {
            flash("Unit not found — check the unit number");
            return;
          }
          patch((s) => ({ elecExtra: [row, ...s.elecExtra], elec: { ...s.elec, token: "" } }));
          flash(R(a) + " · " + k + " kWh captured for " + unitLabel);
        })();
      },

      setLevyField: (p) => patch((s) => ({ levy: { ...s.levy, ...p } })),
      saveLevy: () => {
        const amt = parseFloat(state.levy.amount) || 0;
        if (!amt) {
          flash("Enter an amount");
          return;
        }
        const propertyKey = state.levy.property;
        const note = state.levy.note;
        void (async () => {
          const row = await saveLevyAction({ propertyKey, amount: amt, note });
          if (!row) {
            flash("Property not found");
            return;
          }
          patch((s) => ({ levyExtra: [row, ...s.levyExtra], levy: { ...s.levy, amount: "", note: "" } }));
          flash(R(amt) + " levy captured for " + row.property);
        })();
      },

      openPayment: () => {
        patch({ payOpen: true, payAmount: String(bal > 0 ? Math.round(bal) : Math.round(t ? t.rent : 0)) });
      },
      closePayment: () => patch({ payOpen: false }),
      setPayAmount: (v) => patch({ payAmount: v }),
      savePayment: () => {
        if (!t) return;
        const amt = parseFloat(String(state.payAmount).replace(/[^0-9.]/g, "")) || 0;
        const unitId = t.id;
        const tenantName = t.tenant;
        void (async () => {
          const result = await savePaymentAction({ unitId, amount: amt });
          if (!result) return;
          setUnits((us) => us.map((u) => (u.id === unitId ? { ...u, balance: result.newBalance } : u)));
          patch({ payOpen: false });
          flash(R(amt) + " posted to " + tenantName + "'s ledger");
        })();
      },
      sendDemand: () => {
        if (!t || bal <= 0) {
          flash("No overdue balance — nothing to send");
          return;
        }
        const unitId = t.id;
        const tenantName = t.tenant;
        void (async () => {
          const ok = await sendDemandAction({ unitId });
          if (!ok) {
            flash("No overdue balance — nothing to send");
            return;
          }
          patch((s) => ({ demandSent: { ...s.demandSent, [unitId]: true } }));
          flash("Letter of demand generated for " + tenantName + " · emailed & queued for post");
        })();
      },

      openOffboard: () => patch({ offboardOpen: true, confirm: "", purge: "anonymise" }),
      closeOffboard: () => patch({ offboardOpen: false }),
      setPurge: (m) => patch({ purge: m, confirm: "" }),
      setConfirm: (v) => patch({ confirm: v }),
      confirmOffboard: () => {
        if (!t) return;
        const hard = state.purge === "hard";
        const confirmWord = hard ? "ERASE" : "OFFBOARD";
        const canOffboard = state.confirm.trim().toUpperCase() === confirmWord;
        if (!canOffboard) {
          flash("Type " + confirmWord + " to confirm");
          return;
        }
        const unitId = t.id;
        const purge = state.purge;
        void (async () => {
          const result = await confirmOffboardAction({ unitId, purgeMode: purge });
          if (!result) return;
          setUnits((us) =>
            us.map((u) =>
              u.id === unitId
                ? { ...u, vacant: true, notice: false, tenant: null, balance: 0, vacantSince: TODAY_LABEL }
                : u
            )
          );
          patch({ offboardOpen: false, screen: "vacancy", tenantId: null, confirm: "" });
          flash(result.tenantName + " offboarded · " + result.unitLabel + " is now vacant · archive PDF emailed");
        })();
      },

      ctNew: () =>
        patch({ ct: "form", form: { unit: "", cat: "Plumbing", desc: "", urgency: "Routine", via: "WhatsApp", photos: 1 } }),
      ctNewInspect: () =>
        patch({ ct: "inspect", inspect: { unit: "", type: "Move-in", condition: "Good", notes: "", photos: 1 } }),
      ctBack: () => patch({ ct: "home" }),
      openTicket: (id) => patch({ ct: "detail", ticketId: id }),
      toggleOffline: () => patch((s) => ({ offline: !s.offline })),
      setFormField: (p) => patch((s) => ({ form: { ...s.form, ...p } })),
      addPhoto: () => patch((s) => ({ form: { ...s.form, photos: Math.min(6, s.form.photos + 1) } })),
      submitTicket: () => {
        if (!state.form.unit.trim()) {
          flash("Pick a unit first");
          return;
        }
        const form = state.form;
        const offline = state.offline;
        patch({ ct: "home" });
        flash(
          offline
            ? "Saved offline · syncs when signal returns"
            : "MR-2413 logged for " + form.unit.trim().toUpperCase() + " · landlord notified"
        );
        // A caretaker's newly logged ticket doesn't appear on their own
        // list or the landlord's board until the next sync, matching the
        // original prototype — but it is genuinely persisted here.
        void submitTicketAction(form);
      },
      setInspectField: (p) => patch((s) => ({ inspect: { ...s.inspect, ...p } })),
      addInspectPhoto: () => patch((s) => ({ inspect: { ...s.inspect, photos: Math.min(8, s.inspect.photos + 1) } })),
      submitInspection: () => {
        if (!state.inspect.unit.trim()) {
          flash("Pick a unit first");
          return;
        }
        const inspect = state.inspect;
        const offline = state.offline;
        const u = inspect.unit.trim().toUpperCase();
        void (async () => {
          const row = await submitInspectionAction(inspect);
          patch((s) => ({ ct: "home", inspectExtra: row ? [row, ...s.inspectExtra] : s.inspectExtra }));
          flash(offline ? "Saved offline · syncs when signal returns" : inspect.type + " inspection logged for " + u);
        })();
      },
      advanceStatus: (ticketId, status) => {
        void (async () => {
          await advanceTicketStatusAction({ ticketRef: ticketId, status });
          setTickets((ts) => ts.map((tk) => (tk.id === ticketId ? { ...tk, status } : tk)));
          flash(ticketId + " → " + status + " · photo prompt shown, landlord notified");
        })();
      },

      stubbed: (label) => flash('Prototype — "' + label + '" is stubbed'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, units, tickets, inspectionsBase, leviesBase, patch, flash]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ---- shared derivation helpers ----

function selectedTenant(state: AppState, units: Unit[]): Unit | undefined {
  const occupied = units.filter((u) => !u.vacant);
  return occupied.find((u) => u.id === state.tenantId) || occupied.filter((u) => u.balance > 0)[0] || occupied[0];
}

export interface Derived {
  all: Unit[];
  vacantList: Unit[];
  noticeList: Unit[];
  occupied: number;
  tenant: Unit | undefined;
  bal: number;
  allInspections: Inspection[];
  flaggedCount: number;
  allLevies: Levy[];
  tickets: Ticket[];
  ticket: Ticket;
  board: { label: TicketStatus; count: number; items: Ticket[] }[];
  vacantOf: (u: Unit) => boolean;
  balanceOf: (u: Unit) => number;
  graceDays: number;
  lateFee: number;
}

export function useDerived(): Derived {
  const { state, units, tickets, inspectionsBase, leviesBase } = useApp();

  return useMemo(() => {
    const all = units;
    const vacantList = all.filter((u) => u.vacant);
    const noticeList = all.filter((u) => u.notice && !u.vacant);
    const occupied = all.length - vacantList.length;
    const tenant = selectedTenant(state, units);
    const bal = tenant ? tenant.balance : 0;
    const allInspections = [...inspectionsBase, ...state.inspectExtra];
    const flaggedCount = allInspections.filter((i) => i.condition === "Damage noted").length;
    const allLevies = [...leviesBase, ...state.levyExtra];
    const ticket = tickets.find((x) => x.id === state.ticketId) || tickets[0];
    const board: { label: TicketStatus; count: number; items: Ticket[] }[] = (
      ["Logged", "In progress", "Awaiting parts", "Resolved"] as TicketStatus[]
    ).map((st) => {
      const items = tickets.filter((x) => x.status === st);
      return { label: st, count: items.length, items };
    });

    return {
      all,
      vacantList,
      noticeList,
      occupied,
      tenant,
      bal,
      allInspections,
      flaggedCount,
      allLevies,
      tickets,
      ticket,
      board,
      vacantOf: (u: Unit) => u.vacant,
      balanceOf: (u: Unit) => u.balance,
      graceDays: GRACE_DAYS,
      lateFee: LATE_FEE,
    };
  }, [state, units, tickets, inspectionsBase, leviesBase]);
}

export { CATS, daysSince, TENANT_ELEC_HISTORY };
