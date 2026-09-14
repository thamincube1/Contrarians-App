"use client";

import { useApp } from "@/lib/store";

export default function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;
  return (
    <div
      className="fixed left-[22px] bottom-[22px] px-4 py-3 text-sm font-semibold z-[70]"
      style={{ background: "#201e1d", color: "#f3f2f2" }}
    >
      {state.toast}
    </div>
  );
}
