"use client";

import { useApp, useDerived } from "@/lib/store";
import type { PurgeMode } from "@/lib/types";

const PURGE_MODES: { key: PurgeMode; label: string; body: (tenantName: string, unitLabel: string) => string }[] = [
  {
    key: "anonymise",
    label: "Offboard & anonymise — recommended",
    body: (name, unit) =>
      `Tenant record deleted, unit freed. Lease, invoices and ledger stay, carrying only "${name} · ${unit}" as a reference. Your books survive.`,
  },
  {
    key: "hard",
    label: "Erase completely",
    body: () =>
      "Also deletes invoices, payments and ledger rows. Irreversible, removes this tenant from past financial reports, and may conflict with record-retention rules.",
  },
];

export default function OffboardModal() {
  const { state, R, closeOffboard, setPurge, setConfirm, confirmOffboard } = useApp();
  const { tenant: t, bal, allInspections } = useDerived();

  if (!state.offboardOpen || !t) return null;

  const moveOutRecord = allInspections.find((i) => i.unit === t.label && i.type === "Move-out");
  const blockers = [
    {
      label: "Outstanding balance",
      note: bal > 0 ? "Rent and late fees still owing" : "Ledger settled",
      state: bal > 0 ? R(bal) : "Clear",
      ok: bal === 0,
    },
    {
      label: "Deposit",
      note: `Held ${R(t.rent)} — refund or offset before offboarding`,
      state: "Not returned",
      ok: false,
    },
    { label: "Open repairs", note: "Tickets attached to this unit", state: "None open", ok: true },
    {
      label: "Move-out inspection",
      note: "Photos and condition notes",
      state: moveOutRecord ? `Captured — ${moveOutRecord.condition}` : "Not captured",
      ok: !!moveOutRecord,
    },
  ];

  const hard = state.purge === "hard";
  const confirmWord = hard ? "ERASE" : "OFFBOARD";
  const canOffboard = state.confirm.trim().toUpperCase() === confirmWord;

  return (
    <div
      onClick={closeOffboard}
      className="fixed inset-0 flex items-center justify-center p-6 z-[60]"
      style={{ background: "rgba(32,30,29,.6)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[540px] max-w-full max-h-[92vh] overflow-auto border-2"
        style={{ background: "#f3f2f2", borderColor: "#201e1d" }}
      >
        <div className="py-[18px] px-[22px] pb-3.5 border-b-2" style={{ borderColor: "rgba(32,30,29,.4)" }}>
          <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#ae1800" }}>
            Irreversible · landlord only
          </div>
          <div className="text-2xl font-extrabold tracking-tight mt-[3px]">Offboard {t.tenant}</div>
          <div className="text-[13px]" style={{ color: "#605d5d" }}>
            Closes the lease, frees {t.label}, and removes the tenant record.
          </div>
        </div>
        <div className="py-4 px-[22px]">
          <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase mb-2">Exit checklist</div>
          {blockers.map((b) => (
            <div key={b.label} className="flex gap-2.5 items-baseline py-2.5 border-t" style={{ borderColor: "rgba(32,30,29,.16)" }}>
              <span
                className="w-2.5 h-2.5 block mt-1.5 flex-none"
                style={{ background: b.ok ? "#201e1d" : "#ec3013" }}
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">{b.label}</div>
                <div className="text-xs" style={{ color: "#605d5d" }}>{b.note}</div>
              </div>
              <span className="text-xs font-extrabold whitespace-nowrap" style={{ color: b.ok ? "#605d5d" : "#ae1800" }}>
                {b.state}
              </span>
            </div>
          ))}
        </div>
        <div className="pt-1 px-[22px] pb-4">
          <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase mb-2">Deletion mode</div>
          <div className="grid gap-2">
            {PURGE_MODES.map((m) => {
              const active = state.purge === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPurge(m.key)}
                  className="btn flex gap-2.5 p-3 border"
                  style={{ background: active ? "#eae9e9" : "transparent", borderColor: active ? "#201e1d" : "rgba(32,30,29,.3)" }}
                >
                  <span
                    className="w-3.5 h-3.5 border block mt-1 flex-none"
                    style={{ borderColor: "#201e1d", background: active ? "#ec3013" : "transparent" }}
                  />
                  <span>
                    <span className="block text-sm font-extrabold">{m.label}</span>
                    <span className="block text-xs" style={{ color: "#444141" }}>{m.body(t.tenant || "", t.label)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-[22px] pb-4">
          <label className="grid gap-[5px]">
            <span className="field-label">Type {confirmWord} to confirm</span>
            <input
              className="input"
              style={{ background: "#f8f4f4" }}
              placeholder={confirmWord}
              value={state.confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        </div>
        <div className="py-3.5 px-[22px] pb-5 border-t flex gap-2 items-center" style={{ borderColor: "rgba(32,30,29,.25)" }}>
          <button
            type="button"
            onClick={confirmOffboard}
            disabled={!canOffboard}
            className="btn text-sm px-4 py-2.5"
            style={{ background: hard ? "#7c1405" : "#ec3013", color: "#f3f2f2", opacity: canOffboard ? 1 : 0.45 }}
          >
            {hard ? "Erase tenant & records" : "Offboard & free unit"}
          </button>
          <button type="button" onClick={closeOffboard} className="btn btn-secondary text-sm px-4 py-2.5">
            Cancel
          </button>
          <span className="text-xs ml-auto" style={{ color: "#605d5d" }}>Archive PDF is generated first</span>
        </div>
      </div>
    </div>
  );
}
