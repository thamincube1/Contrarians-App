"use client";

import { useApp } from "@/lib/store";

export default function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;
  return (
    <div
      key={state.toast}
      className="fixed left-[22px] bottom-[22px] px-4 py-3 text-sm font-semibold z-[70] rounded-[16px]"
      style={{
        background: "rgba(32,30,29,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#f3f2f2",
        boxShadow: "var(--shadow-lg)",
        animation: "toastIn 0.32s var(--ease-spring) both",
      }}
    >
      {state.toast}
    </div>
  );
}
