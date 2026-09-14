"use client";

import { useApp, ELEC_PURCHASES_BASE } from "@/lib/store";
import StatRow from "@/components/ui/StatRow";

export default function Electricity() {
  const { state, R, setElecField, saveElec, stubbed } = useApp();

  const purchases = [...state.elecExtra, ...ELEC_PURCHASES_BASE].map((p) => {
    const rate = (p.amount / p.kwh) * 100;
    const odd = rate > 210 || rate < 170;
    return {
      date: p.date,
      unit: p.unit,
      token: p.token,
      amount: R(p.amount),
      kwh: String(p.kwh),
      rate: rate.toFixed(0),
      rateTone: odd ? "#ae1800" : "#201e1d",
      rateWeight: odd ? 800 : 400,
      recharge: p.recharge ? "On next invoice" : "Landlord cost",
      rowBg: odd ? "rgba(255,196,184,.35)" : "transparent",
    };
  });

  const stats = [
    { label: "Spend — Sep to date", value: R(8940), note: "41 purchases across 3 properties", tone: "#201e1d" },
    { label: "Units bought", value: "4,665 kWh", note: "average 192 c/kWh", tone: "#201e1d" },
    { label: "Recharged to tenants", value: R(3120), note: "on next invoice run", tone: "#201e1d" },
    { label: "Rate anomalies", value: "2", note: "flagged for review", tone: "#ae1800" },
  ];

  const a = parseFloat(state.elec.amount);
  const k = parseFloat(state.elec.kwh);
  let rateNote = "Enter amount and kWh to see the effective rate.";
  let rateTone = "#605d5d";
  if (a && k) {
    const r = (a / k) * 100;
    const odd = r > 210 || r < 170;
    rateNote = `${r.toFixed(0)} c/kWh — ${odd ? "outside this meter's usual 175–205 range. Check the kWh figure before saving." : "in line with this meter's history."}`;
    rateTone = odd ? "#ae1800" : "#444141";
  }

  return (
    <div>
      <StatRow stats={stats} />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}>
        <section className="border-r-2" style={{ borderColor: "rgba(32,30,29,.4)" }}>
          <div className="py-4 px-[22px] pb-2">
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Purchase ledger</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th className="pl-[22px] border-b" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Date</th>
                <th style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Unit</th>
                <th style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Token</th>
                <th className="text-right" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Amount</th>
                <th className="text-right" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>kWh</th>
                <th className="text-right" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>c/kWh</th>
                <th className="pr-[22px]" style={{ borderColor: "rgba(32,30,29,.18)", color: "#605d5d" }}>Recharge</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={i} style={{ background: p.rowBg }}>
                  <td className="tabnum pl-[22px]" style={{ color: "#605d5d" }}>{p.date}</td>
                  <td className="tabnum font-extrabold">{p.unit}</td>
                  <td className="text-xs" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#605d5d" }}>{p.token}</td>
                  <td className="tabnum text-right font-semibold">{p.amount}</td>
                  <td className="tabnum text-right">{p.kwh}</td>
                  <td className="tabnum text-right" style={{ color: p.rateTone, fontWeight: p.rateWeight }}>{p.rate}</td>
                  <td className="pr-[22px] text-xs" style={{ color: "#444141" }}>{p.recharge}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="py-3.5 px-[22px] pb-[26px] text-xs" style={{ color: "#605d5d" }}>
            Rows tinted red sit outside their meter&apos;s usual rate band — usually a mistyped kWh figure, occasionally a failing meter. Duplicate token numbers are rejected on entry.
          </div>
        </section>
        <section style={{ background: "#eae9e9" }}>
          <div className="py-4 px-5 pb-2.5 border-b" style={{ borderColor: "rgba(32,30,29,.25)" }}>
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Capture a purchase</h2>
            <div className="text-xs mt-[3px]" style={{ color: "#605d5d" }}>Single entry. Batch mode takes twenty rows at once.</div>
          </div>
          <div className="py-4 px-5 grid gap-3">
            <label className="grid gap-1">
              <span className="field-label">Unit</span>
              <input
                className="tabnum input"
                value={state.elec.unit}
                onChange={(e) => setElecField({ unit: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="grid gap-1">
                <span className="field-label">Amount (R)</span>
                <input
                  className="tabnum input"
                  value={state.elec.amount}
                  onChange={(e) => setElecField({ amount: e.target.value })}
                />
              </label>
              <label className="grid gap-1">
                <span className="field-label">Units (kWh)</span>
                <input
                  className="tabnum input"
                  value={state.elec.kwh}
                  onChange={(e) => setElecField({ kwh: e.target.value })}
                />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="field-label">Token number</span>
              <input
                className="input text-[13px]"
                style={{ fontFamily: "ui-monospace,Menlo,monospace" }}
                value={state.elec.token}
                onChange={(e) => setElecField({ token: e.target.value })}
              />
            </label>
            <div className="grid gap-1">
              <span className="field-label">Receipt</span>
              <div className="photo-slot h-[70px]">
                <span className="text-[10px]" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#605d5d" }}>
                  drop slip photo
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setElecField({ recharge: !state.elec.recharge })}
              className="btn flex items-center gap-2.5 p-0.5"
            >
              <span
                className="w-4 h-4 border block"
                style={{ borderColor: "rgba(32,30,29,.5)", background: state.elec.recharge ? "#ec3013" : "transparent" }}
              />
              <span className="text-[13px] font-semibold">Recharge to tenant on next invoice</span>
            </button>
            <div className="text-xs pl-2.5" style={{ color: rateTone, borderLeft: "2px solid #ec3013" }}>{rateNote}</div>
            <div className="flex gap-2">
              <button type="button" onClick={saveElec} className="btn btn-primary text-sm px-[15px] py-2.5">
                Save purchase
              </button>
              <button
                type="button"
                onClick={() => stubbed("Batch mode")}
                className="btn btn-secondary text-sm px-[15px] py-2.5"
              >
                Batch mode
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
