"use client";

import { useApp, useDerived } from "@/lib/store";
import Tag from "@/components/ui/Tag";

const STATUS_TAG: Record<string, [string, string]> = {
  Logged: ["#ffc4b8", "#7c1405"],
  "In progress": ["#201e1d", "#f3f2f2"],
  "Awaiting parts": ["#d7d3d3", "#444141"],
  Resolved: ["#eae9e9", "#444141"],
};

export default function Home() {
  const { ctNew, ctNewInspect, openTicket } = useApp();
  const { tickets } = useDerived();

  return (
    <div className="flex-1" style={{ background: "#f3f2f2" }}>
      <div className="py-[18px] px-4 border-b-2" style={{ borderColor: "rgba(32,30,29,.4)" }}>
        <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
          Wednesday 2 September
        </div>
        <div className="text-2xl font-extrabold tracking-tight mt-0.5">Morning, Petrus</div>
        <div className="text-sm mt-0.5" style={{ color: "#444141" }}>
          3 open · 1 needs a photo · 1 waiting for sign-off
        </div>
        <button
          type="button"
          onClick={ctNew}
          className="btn btn-primary block w-full text-left text-[17px] p-4 mt-3.5"
        >
          Log a repair
        </button>
        <button
          type="button"
          onClick={ctNewInspect}
          className="btn btn-secondary block w-full text-left text-[15px] px-4 py-3.5 mt-2"
        >
          Log a move-in / move-out inspection
        </button>
      </div>
      <div className="py-3.5 px-4 pb-1.5 text-[11px] font-extrabold tracking-[0.08em] uppercase">My tickets</div>
      {tickets.map((t) => {
        const [tagBg, tagFg] = STATUS_TAG[t.status];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => openTicket(t.id)}
            className="btn block w-full text-left px-4 py-[13px] border-t"
            style={{ borderColor: "rgba(32,30,29,.18)", minHeight: 56 }}
          >
            <div className="flex justify-between gap-2 items-baseline">
              <span className="text-base font-extrabold tracking-tight">{t.unit}</span>
              <Tag label={t.status} bg={tagBg} fg={tagFg} />
            </div>
            <div className="text-sm mt-0.5">{t.title}</div>
            <div className="text-xs mt-px" style={{ color: "#605d5d" }}>
              {t.meta} · via {t.via}
            </div>
          </button>
        );
      })}
    </div>
  );
}
