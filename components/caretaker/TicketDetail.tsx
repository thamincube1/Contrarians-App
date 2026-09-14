"use client";

import { useApp, useDerived } from "@/lib/store";
import type { TicketStatus } from "@/lib/types";

const STEPS: TicketStatus[] = ["Logged", "In progress", "Awaiting parts", "Resolved"];

export default function TicketDetail() {
  const { ctBack, advanceStatus } = useApp();
  const { ticket, all } = useDerived();

  const property = all.find((u) => u.label === ticket.unit)?.property;

  return (
    <div className="flex-1" style={{ background: "#f3f2f2" }}>
      <div className="py-3.5 px-4 flex justify-between items-center" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div>
          <div className="text-[11px]" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#605d5d" }}>{ticket.id}</div>
          <div className="text-xl font-extrabold tracking-tight">{ticket.unit} · {property}</div>
        </div>
        <button type="button" onClick={ctBack} className="btn text-[13px] p-1.5" style={{ color: "#ae1800" }}>
          Back
        </button>
      </div>
      <div className="p-4">
        <div className="text-lg font-extrabold tracking-tight">{ticket.title}</div>
        <div className="text-sm mt-1" style={{ color: "#444141" }}>{ticket.desc}</div>
        <div className="text-xs mt-1.5" style={{ color: "#605d5d" }}>{ticket.meta} · via {ticket.via}</div>
        <div className="flex gap-2 mt-3.5">
          {ticket.photos.map((p, i) => (
            <div key={i} className="photo-slot" style={{ width: 92, height: 70 }}>
              <span className="text-[9px]" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#605d5d" }}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase mb-2">Move status</div>
        <div className="grid gap-1.5">
          {STEPS.map((s) => {
            const isNow = ticket.status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => advanceStatus(ticket.id, s)}
                className="btn flex items-center gap-2.5 px-3 py-3.5 border"
                style={{
                  minHeight: 48,
                  background: isNow ? "#201e1d" : "#f8f4f4",
                  color: isNow ? "#f3f2f2" : "#201e1d",
                  borderColor: "var(--hairline)",
                }}
              >
                <span className="w-3 h-3 rounded-full block" style={{ background: isNow ? "#ec3013" : "#bab6b6" }} />
                <span className="text-[15px] font-extrabold">{s}</span>
                <span className="ml-auto text-xs font-semibold">{isNow ? "current" : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-4 pb-6">
        <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase mb-2">History</div>
        <div className="border-l-2 pl-3 grid gap-2" style={{ borderColor: "rgba(32,30,29,.3)" }}>
          {ticket.timeline.map((t, i) => (
            <div key={i} className="text-[13px]">
              <div className="tabnum" style={{ color: "#605d5d" }}>{t.when}</div>
              <div>{t.what}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
