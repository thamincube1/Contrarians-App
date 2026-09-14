"use client";

import { useApp, useDerived, TENANT_ELEC_HISTORY } from "@/lib/store";
import Tag from "@/components/ui/Tag";

export default function TenantRecord() {
  const { state, R, goScreen, openPayment, openOffboard, sendDemand, stubbed } = useApp();
  const { tenant: t, bal, graceDays, lateFee, allInspections } = useDerived();

  if (!t) return <div className="p-6">No tenant selected.</div>;

  const tags = [
    { label: bal > 0 ? "In arrears" : "Current", bg: bal > 0 ? "#ec3013" : "#d7d3d3", fg: bal > 0 ? "#f3f2f2" : "#444141" },
    { label: `Lease to ${t.leaseEnd}`, bg: "#eae9e9", fg: "#444141" },
    { label: "Prepaid meter", bg: "#eae9e9", fg: "#444141" },
    ...(state.demandSent[t.id] ? [{ label: "Demand sent", bg: "#201e1d", fg: "#f3f2f2" }] : []),
  ];

  const leaseTerms: [string, string][] = [
    ["Unit", `${t.label} · ${t.property}`],
    ["Move-in", t.moveIn],
    ["Lease ends", t.leaseEnd],
    ["Monthly rent", R(t.rent)],
    ["Deposit held", R(t.rent)],
    ["Grace period", `${graceDays} days`],
    ["Late fee", `${R(lateFee)} flat, after grace`],
    ["Phone / WhatsApp", t.phone],
    ["Emergency contact", "N. Botha · +27 82 447 2210"],
    ["Electricity meter", t.meter],
  ];

  const demandSent = !!state.demandSent[t.id];
  const demandLabel = demandSent ? "Letter of demand sent" : "Send letter of demand";
  const demandBorder = bal > 0 ? "#ae1800" : "rgba(32,30,29,.3)";
  const demandColor = bal > 0 ? "#ae1800" : "#9b9797";
  const demandOpacity = bal > 0 ? 1 : 0.5;

  void allInspections;

  return (
    <div className="p-4">
      <div className="surface grid mb-3" style={{ gridTemplateColumns: "minmax(0,1fr) 290px" }}>
        <div className="py-5 px-[22px] pb-[22px]" style={{ borderRight: "1px solid var(--hairline-soft)" }}>
          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {tags.map((tg, i) => (
              <Tag key={i} label={tg.label} bg={tg.bg} fg={tg.fg} />
            ))}
          </div>
          <div className="text-[27px] font-extrabold tracking-tight leading-[1.1]">{t.tenant}</div>
          <div className="text-sm mt-[3px]" style={{ color: "#605d5d" }}>
            {t.phone} · {t.label}, {t.property} · meter {t.meter}
          </div>
          <div className="flex gap-2 mt-3.5 flex-wrap">
            <button type="button" onClick={openPayment} className="btn btn-primary text-[13px] px-3.5 py-2">
              Record payment
            </button>
            <button type="button" onClick={() => stubbed("Email statement")} className="btn btn-secondary text-[13px] px-3.5 py-2">
              Email statement
            </button>
            <button
              type="button"
              onClick={openOffboard}
              className="btn text-[13px] px-3.5 py-2 border"
              style={{ borderColor: "#ae1800", color: "#ae1800" }}
            >
              Offboard tenant
            </button>
            <button
              type="button"
              onClick={sendDemand}
              className="btn text-[13px] px-3.5 py-2 border"
              style={{ borderColor: demandBorder, color: demandColor, opacity: demandOpacity }}
            >
              {demandLabel}
            </button>
            <button type="button" onClick={() => goScreen("units")} className="btn text-[13px] px-1 py-2" style={{ color: "#ae1800" }}>
              ← Units
            </button>
          </div>
        </div>
        <div className="py-5 px-[22px]">
          <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>Current balance</div>
          <div className="tabnum text-[34px] font-extrabold tracking-tight mt-1" style={{ color: bal > 0 ? "#ae1800" : "#201e1d" }}>
            {R(bal)}
          </div>
          <div className="text-[13px]" style={{ color: "#605d5d" }}>
            {bal > 0 ? `Overdue — past the ${graceDays}-day grace period` : "Settled · next invoice 26 Sep"}
          </div>
        </div>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <section className="surface">
          <div className="py-4 px-[22px] pb-1.5">
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Lease &amp; tenant record</h2>
          </div>
          {leaseTerms.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3.5 py-2.5 px-[22px] text-sm" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
              <span style={{ color: "#605d5d" }}>{k}</span>
              <span className="tabnum font-semibold text-right">{v}</span>
            </div>
          ))}
        </section>
        <section className="surface">
          <div className="py-4 px-[22px] pb-1.5">
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Electricity — last 6 purchases</h2>
          </div>
          {TENANT_ELEC_HISTORY.map((e, i) => (
            <div key={i} className="tabnum flex justify-between gap-3.5 py-2.5 px-[22px] text-sm" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
              <span style={{ color: "#605d5d" }}>{e.date}</span>
              <span>{e.kwh}</span>
              <span className="font-semibold">{R(e.amount)}</span>
            </div>
          ))}
          <div className="py-3.5 px-[22px] pb-[26px] text-xs" style={{ borderTop: "1px solid var(--hairline-soft)", color: "#605d5d" }}>
            Six months at an average of R 366 a month. A jump of more than 40% raises a flag on the electricity board.
          </div>
        </section>
      </div>
    </div>
  );
}
