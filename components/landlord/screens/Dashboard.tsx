"use client";

import { useApp, useDerived, PROPS } from "@/lib/store";
import StatRow from "@/components/ui/StatRow";

const ACTIVITY = [
  { time: "06:48", what: "Logged RV-108 — no power in bedroom sockets", who: "P. Nel · in person", tag: "Emergency", tagBg: "#ec3013", tagFg: "#f3f2f2" },
  { time: "08:05", what: "FH-204 moved to In progress, 2 photos added", who: "P. Nel", tag: "Photo", tagBg: "#eae9e9", tagFg: "#444141" },
  { time: "09:12", what: "CC-205 note: rodding failed, plumber needed", who: "P. Nel", tag: "Note", tagBg: "#eae9e9", tagFg: "#444141" },
  { time: "Yesterday", what: "FH-311 marked Resolved — awaiting your sign-off", who: "P. Nel", tag: "Sign-off", tagBg: "#ffc4b8", tagFg: "#7c1405" },
  { time: "Yesterday", what: "3 photos synced from offline outbox", who: "P. Nel · device", tag: "Sync", tagBg: "#eae9e9", tagFg: "#444141" },
];

const ELEC_SUMMARY_VALUES = [
  { spend: 4820, kwh: 2510 },
  { spend: 2140, kwh: 1120 },
  { spend: 1980, kwh: 1035 },
];

export default function Dashboard() {
  const { R, goScreen } = useApp();
  const { all, vacantList, noticeList, occupied, vacantOf } = useDerived();

  const metrics = [
    { label: "Occupied", value: `${occupied} / ${all.length}`, note: `${Math.round((occupied / all.length) * 100)}% occupancy`, tone: "#201e1d" },
    { label: "Vacant", value: String(vacantList.length), note: `${noticeList.length} more on notice`, tone: vacantList.length ? "#ae1800" : "#201e1d" },
    { label: "Rent billed — Sep", value: R(all.filter((u) => !vacantOf(u)).reduce((a, u) => a + u.rent, 0)), note: `${occupied} invoices`, tone: "#201e1d" },
    { label: "Open repairs", value: "11", note: "2 urgent · 1 emergency", tone: "#201e1d" },
  ];

  const occupancy = PROPS.map((p) => {
    const pu = all.filter((u) => u.propertyId === p.id);
    const vac = pu.filter((u) => vacantOf(u)).length;
    return {
      name: p.name,
      detail: `${pu.length - vac} of ${pu.length} occupied`,
      cells: pu.map((u) => ({ bg: vacantOf(u) ? "#ec3013" : u.notice ? "#bab6b6" : "#201e1d" })),
    };
  });

  return (
    <div>
      <StatRow stats={metrics} />
      <div className="grid gap-3 px-4 pb-4" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <section className="surface">
          <div className="py-[18px] px-[22px] pb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Occupancy by property</h2>
            <button type="button" onClick={() => goScreen("vacancy")} className="btn text-xs" style={{ color: "#ae1800" }}>
              Vacancy board →
            </button>
          </div>
          {occupancy.map((o) => (
            <div key={o.name} className="py-3 px-[22px] pb-4" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
              <div className="flex items-baseline justify-between gap-2.5">
                <div className="text-base font-extrabold tracking-tight">{o.name}</div>
                <div className="tabnum text-[13px]" style={{ color: "#605d5d" }}>{o.detail}</div>
              </div>
              <div className="flex gap-[3px] mt-[9px]">
                {o.cells.map((c, i) => (
                  <div key={i} className="flex-1 h-4 rounded-[3px]" style={{ background: c.bg }} />
                ))}
              </div>
            </div>
          ))}
          <div
            className="py-3 px-[22px] pb-[18px] flex gap-4 text-[11px] tracking-[0.06em] uppercase"
            style={{ borderTop: "1px solid var(--hairline-soft)", color: "#605d5d" }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full block" style={{ background: "#201e1d" }} />Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full block" style={{ background: "#ec3013" }} />Vacant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full block" style={{ background: "#bab6b6" }} />On notice
            </span>
          </div>
        </section>
        <section className="surface">
          <div className="py-[18px] px-[22px] pb-2">
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Caretaker activity — today</h2>
          </div>
          {ACTIVITY.map((a, i) => (
            <div
              key={i}
              className="py-[11px] px-[22px] flex gap-3 items-baseline"
              style={{ borderTop: "1px solid var(--hairline-soft)" }}
            >
              <div className="tabnum text-xs min-w-[52px]" style={{ color: "#605d5d" }}>{a.time}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{a.what}</div>
                <div className="text-xs" style={{ color: "#605d5d" }}>{a.who}</div>
              </div>
              <span className="tag" style={{ background: a.tagBg, color: a.tagFg }}>{a.tag}</span>
            </div>
          ))}
          <div className="py-[18px] px-[22px] pb-2" style={{ borderTop: "1px solid var(--hairline)" }}>
            <h2 className="text-xs font-extrabold tracking-[0.08em] uppercase">Electricity — this month</h2>
          </div>
          {PROPS.map((p, i) => (
            <div
              key={p.id}
              className="tabnum py-[11px] px-[22px] flex justify-between gap-3"
              style={{ borderTop: "1px solid var(--hairline-soft)" }}
            >
              <span className="text-sm font-semibold">{p.name}</span>
              <span className="text-sm" style={{ color: "#444141" }}>
                {R(ELEC_SUMMARY_VALUES[i].spend)} · {ELEC_SUMMARY_VALUES[i].kwh} kWh
              </span>
            </div>
          ))}
          <div className="py-3.5 px-[22px] pb-6" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
            <button type="button" onClick={() => goScreen("electricity")} className="btn text-[13px]" style={{ color: "#ae1800" }}>
              Capture purchases →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
