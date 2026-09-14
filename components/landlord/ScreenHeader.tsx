"use client";

import { useApp, useDerived } from "@/lib/store";
import type { LandlordScreen } from "@/lib/types";

const HEADINGS: Record<LandlordScreen, [string, string]> = {
  dashboard: ["September 2026 · 3 properties", "Portfolio overview"],
  vacancy: ["Occupancy", "Vacancy board"],
  units: ["Portfolio", "Properties & units"],
  tickets: ["Operations", "Maintenance board"],
  electricity: ["Utilities", "Electricity purchases"],
  inspections: ["Move-in / move-out", "Inspection records"],
  levies: ["Utilities & levies", "Levies"],
  tenant: ["Tenant record", "Lease & tenant"],
  staff: ["Administration", "Staff & access"],
};

const ACTIONS: Partial<Record<LandlordScreen, [string, boolean][]>> = {
  dashboard: [["Export month", false]],
  vacancy: [["Mark unit ready", false], ["Add listing", true]],
  units: [["Import rent roll", false], ["Add unit", true]],
  tickets: [["Assign vendor", false]],
  electricity: [["CSV import", false], ["Batch capture", true]],
  tenant: [["Email statement", false]],
  staff: [["Invite staff", true]],
};

export default function ScreenHeader() {
  const { state, stubbed } = useApp();
  const { tenant } = useDerived();

  const [crumb, heading] = HEADINGS[state.screen];
  const finalCrumb = state.screen === "tenant" ? "Tenant record · " + (tenant ? tenant.label : "") : crumb;
  const acts = ACTIONS[state.screen] || [];

  return (
    <header
      className="py-5 px-7 pb-4 flex items-end justify-between gap-5 flex-wrap animate-in"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div>
        <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
          {finalCrumb}
        </div>
        <h1 className="mt-[3px] text-[30px] font-extrabold tracking-tight leading-[1.1]">{heading}</h1>
      </div>
      <div className="flex gap-2">
        {acts.map(([label, primary]) => (
          <button
            key={label}
            type="button"
            onClick={() => stubbed(label)}
            className="btn text-[13px] px-[15px] py-2.5 border"
            style={{
              background: primary ? "#ec3013" : "transparent",
              color: primary ? "#f3f2f2" : "#201e1d",
              borderColor: primary ? "#ec3013" : "var(--hairline)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
