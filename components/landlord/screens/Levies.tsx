"use client";

import { useApp, useDerived, PROPS } from "@/lib/store";
import StatRow from "@/components/ui/StatRow";

export default function Levies() {
  const { state, R, setLevyField, saveLevy } = useApp();
  const { allLevies } = useDerived();

  const stats = [
    { label: "Levies — Sep 2026", value: R(4200 + 2600 + 1900), note: "3 properties", tone: "#201e1d" },
    { label: "Levies — Aug 2026", value: R(4200 + 2600 + 1900), note: "3 properties", tone: "#201e1d" },
    { label: "Outstanding", value: R(0), note: "paid on receipt", tone: "#201e1d" },
    { label: "YTD total", value: R((4200 + 2600 + 1900) * 9), note: "Jan – Sep 2026", tone: "#201e1d" },
  ];

  return (
    <div>
      <StatRow stats={stats} />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}>
        <section className="border-r-2" style={{ borderColor: "rgba(32,30,29,.4)" }}>
          <div className="py-4 px-[22px] pb-2">
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Levy ledger</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th className="pl-[22px] border-b" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Month</th>
                <th style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Property</th>
                <th className="text-right" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Amount</th>
                <th className="pr-[22px]" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {allLevies.map((l, i) => (
                <tr key={i}>
                  <td className="tabnum pl-[22px]" style={{ color: "#605d5d" }}>{l.month}</td>
                  <td className="font-extrabold">{l.property}</td>
                  <td className="tabnum text-right font-semibold">{R(l.amount)}</td>
                  <td className="pr-[22px] text-xs" style={{ color: "#444141" }}>{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="py-3.5 px-[22px] pb-[26px] text-xs" style={{ color: "#605d5d" }}>
            Levies are captured per property, not per unit, and roll into the monthly landlord statement alongside rent and electricity.
          </div>
        </section>
        <section style={{ background: "#eae9e9" }}>
          <div className="py-4 px-5 pb-2.5 border-b" style={{ borderColor: "rgba(32,30,29,.25)" }}>
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Capture a levy</h2>
          </div>
          <div className="py-4 px-5 grid gap-3">
            <div className="grid gap-1.5">
              <span className="field-label">Property</span>
              <div className="flex border" style={{ borderColor: "rgba(32,30,29,.4)" }}>
                {PROPS.map((p) => {
                  const active = state.levy.property === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setLevyField({ property: p.id })}
                      className="btn flex-1 text-left text-[13px] px-2.5 py-2.5 border-r"
                      style={{
                        borderColor: "rgba(32,30,29,.25)",
                        background: active ? "#201e1d" : "transparent",
                        color: active ? "#f3f2f2" : "#201e1d",
                      }}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="grid gap-1">
              <span className="field-label">Amount (R)</span>
              <input
                className="tabnum input"
                value={state.levy.amount}
                onChange={(e) => setLevyField({ amount: e.target.value })}
              />
            </label>
            <label className="grid gap-1">
              <span className="field-label">Note</span>
              <input
                className="input"
                placeholder="e.g. Body corporate — Sep"
                value={state.levy.note}
                onChange={(e) => setLevyField({ note: e.target.value })}
              />
            </label>
            <button type="button" onClick={saveLevy} className="btn btn-primary text-sm px-[15px] py-2.5">
              Save levy
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
