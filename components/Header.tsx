"use client";

import { useApp } from "@/lib/store";
import { logoutAction } from "@/lib/auth-actions";
import Tag from "@/components/ui/Tag";

export default function Header({ userName }: { userName: string }) {
  const { state, toggleMobileNav } = useApp();

  return (
    <div
      className="chrome-blur safe-top flex items-center sticky top-0 z-40"
      style={{ borderBottom: "1px solid var(--hairline)", boxShadow: "var(--shadow-xs)" }}
    >
      {state.role === "landlord" && (
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Open menu"
          className="btn flex-none flex items-center justify-center sm:hidden"
          style={{ width: 44, height: 44 }}
        >
          <span aria-hidden style={{ fontSize: 18 }}>☰</span>
        </button>
      )}
      <div
        className="flex items-center gap-2 sm:gap-2.5 py-3 px-3 sm:px-5 sm:border-r min-w-0 flex-none"
        style={{ borderColor: "var(--hairline-soft)" }}
      >
        <div className="w-3.5 h-3.5 rounded-[4px] flex-none" style={{ background: "#ec3013" }} />
        <div className="font-extrabold text-[15px] tracking-tight flex-none">CONTRARIANS</div>
        <div className="hidden sm:block text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
          Internal ops
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-5 flex-1 min-w-0">
        <span className="hidden sm:inline text-[11px] tracking-[0.08em] uppercase flex-none" style={{ color: "#605d5d" }}>
          Signed in as
        </span>
        <span className="text-[13px] font-extrabold tracking-tight truncate min-w-0">{userName}</span>
        {/* Dropped below 360px (e.g. 320px phones), where the wordmark, menu,
            name and sign-out already fill the row — the name stays visible. */}
        <span className="flex flex-none max-[359px]:hidden">
          <Tag label={state.role === "landlord" ? "Landlord" : "Caretaker"} bg="#201e1d" fg="#f3f2f2" />
        </span>
        <span className="hidden sm:inline text-xs flex-none" style={{ color: "#605d5d" }}>
          {state.role === "landlord"
            ? "Full access — money, portfolio, deletion"
            : "Restricted — repairs and unit lists only"}
        </span>
        <form action={logoutAction} className="hidden sm:block ml-auto flex-none">
          <button type="submit" className="btn text-[13px] px-3 py-1.5" style={{ color: "#ae1800" }}>
            Sign out
          </button>
        </form>
        <form action={logoutAction} className="sm:hidden ml-auto flex-none">
          <button
            type="submit"
            aria-label="Sign out"
            className="btn flex items-center justify-center"
            style={{ color: "#ae1800", width: 44, height: 44 }}
          >
            <span aria-hidden style={{ fontSize: 18 }}>⏻</span>
          </button>
        </form>
      </div>
    </div>
  );
}
