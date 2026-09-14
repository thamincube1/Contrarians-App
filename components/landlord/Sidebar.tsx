"use client";

import { useApp, useDerived } from "@/lib/store";
import type { LandlordScreen } from "@/lib/types";

const NAV: { id: LandlordScreen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "vacancy", label: "Vacancy" },
  { id: "units", label: "Properties & units" },
  { id: "tickets", label: "Maintenance" },
  { id: "electricity", label: "Electricity" },
  { id: "inspections", label: "Inspections" },
  { id: "levies", label: "Levies" },
  { id: "tenant", label: "Tenants" },
  { id: "staff", label: "Staff & access" },
];

export default function Sidebar() {
  const { state, goScreen } = useApp();
  const { all, vacantList, flaggedCount, occupied } = useDerived();

  const badges: Record<LandlordScreen, string> = {
    dashboard: "",
    vacancy: String(vacantList.length),
    units: String(all.length),
    tickets: "11",
    electricity: "",
    inspections: String(flaggedCount),
    levies: "",
    tenant: String(occupied),
    staff: "2",
  };

  return (
    <aside className="border-r-2 py-5" style={{ borderColor: "rgba(32,30,29,.4)" }}>
      <nav className="flex flex-col">
        {NAV.map((item) => {
          const active = state.screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goScreen(item.id)}
              className="btn flex items-baseline justify-between gap-2 py-2.5 px-5"
              style={{ fontWeight: active ? 800 : 600 }}
            >
              <span className="text-sm" style={{ color: active ? "#ec3013" : "#605d5d", fontWeight: active ? 800 : 600 }}>
                {item.label}
              </span>
              <span className="tabnum text-[11px]" style={{ color: active ? "#ec3013" : "#9b9797" }}>
                {badges[item.id]}
              </span>
            </button>
          );
        })}
      </nav>
      <div
        className="mx-5 mt-5 pt-3.5 border-t-2 text-xs"
        style={{ borderColor: "rgba(32,30,29,.4)", color: "#605d5d" }}
      >
        <div className="font-extrabold text-[13px]" style={{ color: "#201e1d" }}>
          M. Brandt
        </div>
        Landlord · full access
      </div>
    </aside>
  );
}
