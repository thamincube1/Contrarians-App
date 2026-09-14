"use client";

import { useApp, useDerived, daysSince } from "@/lib/store";
import StatRow from "@/components/ui/StatRow";
import Tag from "@/components/ui/Tag";

export default function Vacancy() {
  const { R } = useApp();
  const { vacantList, noticeList, all, vacantOf } = useDerived();

  const stats = [
    { label: "Vacant now", value: String(vacantList.length), note: `of ${all.length} units`, tone: "#ae1800" },
    {
      label: "Average days vacant",
      value: vacantList.length
        ? String(Math.round(vacantList.reduce((a, u) => a + daysSince(u.vacantSince || "02 Sep 2026"), 0) / vacantList.length))
        : "0",
      note: "from unit_status_history",
      tone: "#201e1d",
    },
    { label: "Rent lost — month to date", value: R(vacantList.reduce((a, u) => a + u.rent, 0)), note: "at listed rent", tone: "#ae1800" },
    { label: "On notice", value: String(noticeList.length), note: "leases ending inside 60 days", tone: "#201e1d" },
  ];

  const rows = [...vacantList, ...noticeList].map((u) => {
    const vac = vacantOf(u);
    const d = vac ? daysSince(u.vacantSince || "02 Sep 2026") : 0;
    return {
      unit: u,
      label: u.label,
      property: u.property,
      status: vac ? "Vacant" : "On notice",
      tagBg: vac ? "#ec3013" : "#d7d3d3",
      tagFg: vac ? "#f3f2f2" : "#444141",
      since: vac ? u.vacantSince || "02 Sep 2026" : "—",
      days: vac ? String(d) : "—",
      lost: vac ? R((u.rent / 30) * d) : "—",
      ready: vac ? (d > 20 ? "Yes — listed" : "Repaint outstanding") : `Lease runs to ${u.leaseEnd}`,
    };
  });

  return (
    <div>
      <StatRow stats={stats} />
      <div className="surface mx-4">
        <table className="table">
          <thead>
            <tr style={{ background: "#eae9e9" }}>
              <th className="pl-[22px]">Unit</th>
              <th>Property</th>
              <th>Status</th>
              <th className="text-right">Vacant since</th>
              <th className="text-right">Days</th>
              <th className="text-right">Rent lost</th>
              <th className="pr-[22px]">Ready to let</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.unit.id}>
                <td className="tabnum pl-[22px] font-extrabold">{r.label}</td>
                <td style={{ color: "#605d5d" }}>{r.property}</td>
                <td>
                  <Tag label={r.status} bg={r.tagBg} fg={r.tagFg} />
                </td>
                <td className="tabnum text-right" style={{ color: "#605d5d" }}>{r.since}</td>
                <td className="tabnum text-right font-extrabold">{r.days}</td>
                <td className="tabnum text-right font-extrabold" style={{ color: "#ae1800" }}>{r.lost}</td>
                <td className="pr-[22px]" style={{ color: "#444141" }}>{r.ready}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="py-4 px-[22px] pb-[30px] text-xs" style={{ color: "#605d5d" }}>
        Status changes are written to <span style={{ fontFamily: "ui-monospace,Menlo,monospace" }}>unit_status_history</span> — that is where days-vacant and lost rent come from, not from the status column alone.
      </div>
    </div>
  );
}
