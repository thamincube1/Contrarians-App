"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CATS,
  ELEC_PURCHASES_BASE,
  INSPECTIONS_BASE,
  LEVIES_BASE,
  PROPS,
  STAFF,
  TENANT_ELEC_HISTORY,
  TICKETS,
  buildUnits,
  daysSince,
  formatR,
} from "./mock-data";
import type {
  CaretakerScreen,
  ElecFormState,
  Inspection,
  InspectFormState,
  LandlordScreen,
  Levy,
  LevyFormState,
  PurgeMode,
  RepairFormState,
  Role,
  Ticket,
  TicketStatus,
  Unit,
} from "./types";

const GRACE_DAYS = 5;
const LATE_FEE = 250;

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
  removed: Record<string, boolean>;
  extraPayments: Record<string, number>;
  elecExtra: { date: string; unit: string; token: string; amount: number; kwh: number; recharge: boolean }[];
  demandSent: Record<string, boolean>;
  elec: ElecFormState;
  inspectExtra: Inspection[];
  inspect: InspectFormState;
  levyExtra: Levy[];
  levy: LevyFormState;
  ct: CaretakerScreen;
  ticketId: string;
  offline: boolean;
  toast: string;
  form: RepairFormState;
}

const initialState: AppState = {
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
  removed: {},
  extraPayments: {},
  elecExtra: [],
  demandSent: {},
  elec: { unit: "FH-204", amount: "400", kwh: "212", token: "", recharge: true },
  inspectExtra: [],
  inspect: { unit: "", type: "Move-in", condition: "Good", notes: "", photos: 1 },
  levyExtra: [],
  levy: { property: "fh", amount: "", note: "" },
  ct: "home",
  ticketId: "MR-2411",
  offline: false,
  toast: "",
  form: { unit: "", cat: "Plumbing", desc: "", urgency: "Routine", via: "WhatsApp", photos: 1 },
};

interface AppContextValue {
  state: AppState;
  units: Unit[];
  R: (n: number) => string;
  flash: (m: string) => void;
  setRole: (r: Role) => void;
  goScreen: (s: LandlordScreen) => void;
  setQuery: (q: string) => void;
  setFilter: (f: string) => void;
  openTenant: (unitId: string) => void;

  // Electricity
  setElecField: (patch: Partial<ElecFormState>) => void;
  saveElec: () => void;

  // Levies
  setLevyField: (patch: Partial<LevyFormState>) => void;
  saveLevy: () => void;

  // Tenant record
  openPayment: () => void;
  closePayment: () => void;
  setPayAmount: (v: string) => void;
  savePayment: () => void;
  sendDemand: () => void;

  // Offboarding
  openOffboard: () => void;
  closeOffboard: () => void;
  setPurge: (m: PurgeMode) => void;
  setConfirm: (v: string) => void;
  confirmOffboard: () => void;

  // Caretaker
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const units = useMemo(() => buildUnits(), []);
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
    return {
      state,
      units,
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
        patch((s) => ({
          elecExtra: [
            {
              date: "02 Sep 2026",
              unit: s.elec.unit,
              token:
                s.elec.token ||
                "4213 8894 " +
                  Math.floor(1000 + Math.random() * 8999) +
                  " " +
                  Math.floor(1000 + Math.random() * 8999),
              amount: a,
              kwh: k,
              recharge: s.elec.recharge,
            },
            ...s.elecExtra,
          ],
          elec: { ...s.elec, token: "" },
        }));
        flash(R(a) + " · " + k + " kWh captured for " + state.elec.unit);
      },

      setLevyField: (p) => patch((s) => ({ levy: { ...s.levy, ...p } })),
      saveLevy: () => {
        const amt = parseFloat(state.levy.amount) || 0;
        if (!amt) {
          flash("Enter an amount");
          return;
        }
        const propName = (PROPS.find((p) => p.id === state.levy.property) || PROPS[0]).name;
        patch((s) => ({
          levyExtra: [
            { month: "Sep 2026", property: propName, amount: amt, note: s.levy.note || "Manual capture" },
            ...s.levyExtra,
          ],
          levy: { ...s.levy, amount: "", note: "" },
        }));
        flash(R(amt) + " levy captured for " + propName);
      },

      openPayment: () => {
        const t = selectedTenant(state, units);
        const bal = balanceOf(state, t);
        patch({ payOpen: true, payAmount: String(bal > 0 ? Math.round(bal) : Math.round(t ? t.rent : 0)) });
      },
      closePayment: () => patch({ payOpen: false }),
      setPayAmount: (v) => patch({ payAmount: v }),
      savePayment: () => {
        const t = selectedTenant(state, units);
        if (!t) return;
        const amt = parseFloat(String(state.payAmount).replace(/[^0-9.]/g, "")) || 0;
        patch((s) => ({
          payOpen: false,
          extraPayments: { ...s.extraPayments, [t.id]: (s.extraPayments[t.id] || 0) + amt },
        }));
        flash(R(amt) + " posted to " + t.tenant + "'s ledger");
      },
      sendDemand: () => {
        const t = selectedTenant(state, units);
        const bal = t ? balanceOf(state, t) : 0;
        if (!t || bal <= 0) {
          flash("No overdue balance — nothing to send");
          return;
        }
        patch((s) => ({ demandSent: { ...s.demandSent, [t.id]: true } }));
        flash("Letter of demand generated for " + t.tenant + " · emailed & queued for post");
      },

      openOffboard: () => patch({ offboardOpen: true, confirm: "", purge: "anonymise" }),
      closeOffboard: () => patch({ offboardOpen: false }),
      setPurge: (m) => patch({ purge: m, confirm: "" }),
      setConfirm: (v) => patch({ confirm: v }),
      confirmOffboard: () => {
        const t = selectedTenant(state, units);
        if (!t) return;
        const hard = state.purge === "hard";
        const confirmWord = hard ? "ERASE" : "OFFBOARD";
        const canOffboard = state.confirm.trim().toUpperCase() === confirmWord;
        if (!canOffboard) {
          flash("Type " + confirmWord + " to confirm");
          return;
        }
        const name = t.tenant;
        const label = t.label;
        patch((s) => ({
          offboardOpen: false,
          screen: "vacancy",
          tenantId: null,
          confirm: "",
          removed: { ...s.removed, [t.id]: true },
        }));
        flash(name + " offboarded · " + label + " is now vacant · archive PDF emailed");
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
        patch({ ct: "home" });
        flash(
          state.offline
            ? "Saved offline · syncs when signal returns"
            : "MR-2413 logged for " + state.form.unit.trim().toUpperCase() + " · landlord notified"
        );
      },
      setInspectField: (p) => patch((s) => ({ inspect: { ...s.inspect, ...p } })),
      addInspectPhoto: () => patch((s) => ({ inspect: { ...s.inspect, photos: Math.min(8, s.inspect.photos + 1) } })),
      submitInspection: () => {
        if (!state.inspect.unit.trim()) {
          flash("Pick a unit first");
          return;
        }
        const u = state.inspect.unit.trim().toUpperCase();
        const match = units.find((x) => x.label === u);
        patch((s) => ({
          ct: "home",
          inspectExtra: [
            {
              id: "IN-" + (90 + s.inspectExtra.length),
              unit: u,
              property: match ? match.property : "—",
              type: s.inspect.type,
              date: "02 Sep 2026",
              tenant: match && match.tenant ? match.tenant : "Vacant",
              condition: s.inspect.condition,
              caretaker: "P. Nel",
              photos: s.inspect.photos,
            },
            ...s.inspectExtra,
          ],
        }));
        flash(
          state.offline ? "Saved offline · syncs when signal returns" : state.inspect.type + " inspection logged for " + u
        );
      },
      advanceStatus: (ticketId, status) => {
        flash(ticketId + " → " + status + " · photo prompt shown, landlord notified");
      },

      stubbed: (label) => flash('Prototype — "' + label + '" is stubbed'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, units, patch, flash]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ---- shared derivation helpers (used both inside the provider and by hooks) ----

function selectedTenant(state: AppState, units: Unit[]): Unit | undefined {
  const occupied = units.filter((u) => !u.vacant && !state.removed[u.id]);
  return (
    occupied.find((u) => u.id === state.tenantId) ||
    occupied.filter((u) => balanceOf(state, u) > 0)[0] ||
    occupied[0]
  );
}

function balanceOf(state: AppState, u?: Unit): number {
  if (!u) return 0;
  const paid = state.extraPayments[u.id] || 0;
  return Math.max(0, u.balance - paid);
}

function vacantOf(state: AppState, u: Unit): boolean {
  return u.vacant || !!state.removed[u.id];
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
  const { state, units } = useApp();

  return useMemo(() => {
    const all = units;
    const vacantList = all.filter((u) => vacantOf(state, u));
    const noticeList = all.filter((u) => u.notice && !vacantOf(state, u));
    const occupied = all.length - vacantList.length;
    const tenant = selectedTenant(state, units);
    const bal = balanceOf(state, tenant);
    const allInspections = [...INSPECTIONS_BASE, ...state.inspectExtra];
    const flaggedCount = allInspections.filter((i) => i.condition === "Damage noted").length;
    const allLevies = [...LEVIES_BASE, ...state.levyExtra];
    const tickets = TICKETS;
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
      vacantOf: (u: Unit) => vacantOf(state, u),
      balanceOf: (u: Unit) => balanceOf(state, u),
      graceDays: GRACE_DAYS,
      lateFee: LATE_FEE,
    };
  }, [state, units]);
}

export { CATS, daysSince, TENANT_ELEC_HISTORY, ELEC_PURCHASES_BASE, PROPS, STAFF };
