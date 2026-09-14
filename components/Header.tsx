"use client";

import { useApp } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLES: { id: Role; label: string }[] = [
  { id: "landlord", label: "Landlord" },
  { id: "caretaker", label: "Caretaker" },
];

export default function Header() {
  const { state, setRole } = useApp();

  return (
    <div
      className="chrome-blur flex items-center sticky top-0 z-40"
      style={{ borderBottom: "1px solid var(--hairline)", boxShadow: "var(--shadow-xs)" }}
    >
      <div
        className="flex items-center gap-2.5 py-3 px-5 border-r"
        style={{ borderColor: "var(--hairline-soft)" }}
      >
        <div className="w-3.5 h-3.5 rounded-[4px]" style={{ background: "#ec3013" }} />
        <div className="font-extrabold text-[15px] tracking-tight">HAUSWERK</div>
        <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
          Internal ops
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-5">
        <span className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
          Signed in as
        </span>
        <div className="segmented">
          {ROLES.map((r) => {
            const active = state.role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className="btn seg-btn text-[13px] px-3.5 py-1.5"
                style={{
                  background: active ? "#201e1d" : "transparent",
                  color: active ? "#f3f2f2" : "#201e1d",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs" style={{ color: "#605d5d" }}>
          {state.role === "landlord"
            ? "Full access — money, portfolio, deletion"
            : "Restricted — repairs and unit lists only"}
        </span>
      </div>
    </div>
  );
}
