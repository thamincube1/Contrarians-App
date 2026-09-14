"use client";

import { useDerived } from "@/lib/store";
import Tag from "@/components/ui/Tag";
import type { TicketPriority } from "@/lib/types";

const PRIORITY_TAG: Record<TicketPriority, [string, string]> = {
  Emergency: ["#ec3013", "#f3f2f2"],
  Urgent: ["#ffc4b8", "#7c1405"],
  Routine: ["#d7d3d3", "#444141"],
};

export default function Maintenance() {
  const { board } = useDerived();

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))", minHeight: 400 }}>
      {board.map((col) => (
        <div key={col.label} className="border-r" style={{ borderColor: "rgba(32,30,29,.18)" }}>
          <div
            className="py-3.5 px-4 pb-2.5 border-b-2 flex justify-between items-baseline"
            style={{ borderColor: "rgba(32,30,29,.4)" }}
          >
            <span className="text-xs font-extrabold tracking-[0.08em] uppercase">{col.label}</span>
            <span className="tabnum text-xs font-extrabold" style={{ color: "#605d5d" }}>{col.count}</span>
          </div>
          {col.items.map((t) => {
            const [tagBg, tagFg] = PRIORITY_TAG[t.priority];
            return (
              <div key={t.id} className="p-3 px-4 border-b" style={{ borderColor: "rgba(32,30,29,.18)" }}>
                <div className="flex justify-between gap-2 items-baseline">
                  <span className="text-[11px]" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#605d5d" }}>
                    {t.id}
                  </span>
                  <Tag label={t.priority} bg={tagBg} fg={tagFg} />
                </div>
                <div className="text-sm font-extrabold tracking-tight mt-1">{t.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#605d5d" }}>{t.unit} · {t.meta}</div>
                <div className="text-[11px] mt-1.5 tracking-[0.04em] uppercase" style={{ color: "#605d5d" }}>
                  via {t.via}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
