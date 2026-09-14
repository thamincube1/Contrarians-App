"use client";

import { useApp } from "@/lib/store";
import Sidebar from "./Sidebar";
import ScreenHeader from "./ScreenHeader";
import Dashboard from "./screens/Dashboard";
import Vacancy from "./screens/Vacancy";
import Units from "./screens/Units";
import Maintenance from "./screens/Maintenance";
import Electricity from "./screens/Electricity";
import Inspections from "./screens/Inspections";
import Levies from "./screens/Levies";
import TenantRecord from "./screens/TenantRecord";
import Staff from "./screens/Staff";

export default function LandlordShell() {
  const { state } = useApp();

  return (
    <div className="grid" style={{ gridTemplateColumns: "224px minmax(0,1fr)", minHeight: "calc(100vh - 51px)" }}>
      <Sidebar />
      <main className="min-w-0">
        <ScreenHeader />
        {state.screen === "dashboard" && <Dashboard />}
        {state.screen === "vacancy" && <Vacancy />}
        {state.screen === "units" && <Units />}
        {state.screen === "tickets" && <Maintenance />}
        {state.screen === "electricity" && <Electricity />}
        {state.screen === "inspections" && <Inspections />}
        {state.screen === "levies" && <Levies />}
        {state.screen === "tenant" && <TenantRecord />}
        {state.screen === "staff" && <Staff />}
      </main>
    </div>
  );
}
