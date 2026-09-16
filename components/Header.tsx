"use client";

import { useApp } from "@/lib/store";
import { logoutAction } from "@/lib/auth-actions";
import Tag from "@/components/ui/Tag";

export default function Header({ userName }: { userName: string }) {
  const { state } = useApp();

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
      <div className="flex items-center gap-2.5 px-5 flex-1">
        <span className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
          Signed in as
        </span>
        <span className="text-[13px] font-extrabold tracking-tight">{userName}</span>
        <Tag label={state.role === "landlord" ? "Landlord" : "Caretaker"} bg="#201e1d" fg="#f3f2f2" />
        <span className="text-xs" style={{ color: "#605d5d" }}>
          {state.role === "landlord"
            ? "Full access — money, portfolio, deletion"
            : "Restricted — repairs and unit lists only"}
        </span>
        <form action={logoutAction} className="ml-auto">
          <button type="submit" className="btn text-[13px] px-3 py-1.5" style={{ color: "#ae1800" }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
