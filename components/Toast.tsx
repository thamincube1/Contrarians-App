"use client";

import { useApp } from "@/lib/store";

export default function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;
  return (
    <div
      key={state.toast}
      className="fixed left-[22px] px-4 py-3 text-sm font-semibold z-[70] rounded-[16px] max-w-[calc(100vw-44px)]"
      style={{
        bottom: "calc(22px + env(safe-area-inset-bottom, 0px))",
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
