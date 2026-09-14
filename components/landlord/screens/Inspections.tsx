"use client";

import { useDerived } from "@/lib/store";
import StatRow from "@/components/ui/StatRow";
import Tag from "@/components/ui/Tag";

export default function Inspections() {
  const { allInspections, flaggedCount } = useDerived();

  const stats = [
    { label: "Logged this year", value: String(allInspections.filter((i) => i.date !== "—").length), note: "move-ins & move-outs", tone: "#201e1d" },
    { label: "Move-outs", value: String(allInspections.filter((i) => i.type === "Move-out").length), note: "on record", tone: "#201e1d" },
    { label: "Damage noted", value: String(flaggedCount), note: "flagged for deposit review", tone: flaggedCount ? "#ae1800" : "#201e1d" },
    { label: "Pending", value: String(allInspections.filter((i) => i.condition === "Pending").length), note: "move-in not yet captured", tone: "#201e1d" },
  ];

  return (
    <div>
      <StatRow stats={stats} />
      <div className="surface mx-4">
        <table className="table">
          <thead>
            <tr style={{ background: "#eae9e9" }}>
              <th className="pl-[22px]">Unit</th>
              <th>Property</th>
              <th>Type</th>
              <th>Date</th>
              <th>Tenant</th>
              <th>Condition</th>
              <th>Caretaker</th>
              <th className="text-right pr-[22px]">Photos</th>
            </tr>
          </thead>
          <tbody>
            {allInspections.map((i) => (
              <tr key={i.id}>
                <td className="tabnum pl-[22px] font-extrabold">{i.unit}</td>
                <td style={{ color: "#605d5d" }}>{i.property}</td>
                <td>
                  <Tag
                    label={i.type}
                    bg={i.type === "Move-out" ? "#201e1d" : "#eae9e9"}
                    fg={i.type === "Move-out" ? "#f3f2f2" : "#444141"}
                  />
                </td>
                <td className="tabnum" style={{ color: "#605d5d" }}>{i.date}</td>
                <td>{i.tenant}</td>
                <td
                  className="font-semibold"
                  style={{ color: i.condition === "Damage noted" ? "#ae1800" : i.condition === "Pending" ? "#605d5d" : "#201e1d" }}
                >
                  {i.condition}
                </td>
                <td style={{ color: "#605d5d" }}>{i.caretaker}</td>
                <td className="tabnum text-right pr-[22px]">{i.photos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="py-4 px-[22px] pb-[30px] text-xs" style={{ color: "#605d5d" }}>
        Move-in and move-out inspections are logged by the caretaker on-site — condition notes and photos attach to the unit&apos;s record and are checked automatically by the offboarding flow.
      </div>
    </div>
  );
}
