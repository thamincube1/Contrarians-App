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

/** The nav item list, shared by the desktop sidebar and the mobile sheet below. */
function NavItems({ onNavigate }: { onNavigate: (id: LandlordScreen) => void }) {
  const { state } = useApp();
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
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = state.screen === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className="btn flex items-baseline justify-between gap-2 py-3 px-3.5"
            style={{
              minHeight: 44,
              fontWeight: active ? 800 : 600,
              background: active ? "rgba(236,48,19,0.1)" : "transparent",
            }}
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
  );
}

function Identity() {
  return (
    <div className="mx-5 mt-5 pt-3.5 text-xs" style={{ borderTop: "1px solid var(--hairline)", color: "#605d5d" }}>
      <div className="font-extrabold text-[13px]" style={{ color: "#201e1d" }}>
        M. Brandt
      </div>
      Landlord · full access
    </div>
  );
}

export default function Sidebar() {
  const { state, goScreen, closeMobileNav } = useApp();

  return (
    <>
      {/* Desktop sidebar — a fixed column, hidden below 640px (see .sidebar-desktop in globals.css). */}
      <aside
        className="sidebar-desktop chrome-blur py-5 sticky top-[51px] self-start"
        style={{ borderRight: "1px solid var(--hairline)", height: "calc(100dvh - 51px)", overflowY: "auto" }}
      >
        <NavItems onNavigate={goScreen} />
        <Identity />
      </aside>

      {/* Mobile nav sheet — the sidebar's small-screen replacement, toggled by
          the hamburger button in Header.tsx. Only rendered (and only visible
          via the .mobile-nav-sheet media queries) below 640px. */}
      {state.mobileNavOpen && (
        <div className="mobile-nav-sheet">
          <div className="modal-backdrop absolute inset-0" onClick={closeMobileNav} />
          <div
            className="absolute left-0 top-0 bottom-0 safe-top safe-bottom animate-in"
            style={{
              width: "min(84vw, 320px)",
              background: "var(--color-bg)",
              boxShadow: "var(--shadow-lg)",
              overflowY: "auto",
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="font-extrabold text-[15px] tracking-tight">HAUSWERK</div>
              <button
                type="button"
                onClick={closeMobileNav}
                aria-label="Close menu"
                className="btn flex items-center justify-center"
                style={{ width: 44, height: 44 }}
              >
                <span aria-hidden style={{ fontSize: 18 }}>✕</span>
              </button>
            </div>
            <NavItems onNavigate={goScreen} />
            <Identity />
          </div>
        </div>
      )}
    </>
  );
}
