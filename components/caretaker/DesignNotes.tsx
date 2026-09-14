"use client";

import { useApp } from "@/lib/store";

const NOTES = [
  { title: "One button, not a menu", body: "Logging a repair is the only thing on the home screen. Everything else is a list of the caretaker's own tickets." },
  { title: "Camera first", body: "Photos come from the native camera at capture time and compress on the device before upload." },
  { title: "Offline outbox", body: "Tickets and photos queue locally when there is no signal. Use the button below to see the offline state." },
  { title: "Four states only", body: "Logged, In progress, Awaiting parts, Resolved. Closing a ticket stays with the landlord." },
  { title: "No money, ever", body: "Costs, rent, balances and invoices are not returned to a caretaker session — enforced by row-level security, not by hidden menus." },
  { title: "48px minimum targets", body: "Every control is thumb-sized, flush-left, and readable in daylight." },
];

export default function DesignNotes() {
  const { state, toggleOffline } = useApp();

  return (
    <div className="p-[30px] pt-7 max-w-[560px]">
      <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
        Design notes — caretaker shell
      </div>
      <h2 className="text-[22px] font-extrabold tracking-tight my-1.5 mb-3.5">Built for one hand, one bar of signal</h2>
      <div className="grid border-t-2" style={{ borderColor: "rgba(32,30,29,.4)" }}>
        {NOTES.map((n) => (
          <div key={n.title} className="py-2.5 border-b" style={{ borderColor: "rgba(32,30,29,.2)" }}>
            <div className="text-sm font-extrabold">{n.title}</div>
            <div className="text-[13px]" style={{ color: "#444141" }}>{n.body}</div>
          </div>
        ))}
      </div>
      <button type="button" onClick={toggleOffline} className="btn btn-secondary text-[13px] px-3.5 py-2.5 mt-4">
        {state.offline ? "Simulate reconnect" : "Simulate no signal"}
      </button>
    </div>
  );
}
