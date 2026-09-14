"use client";

import { useApp, useDerived, CATS } from "@/lib/store";
import type { TicketPriority } from "@/lib/types";

const URGENCIES: TicketPriority[] = ["Routine", "Urgent", "Emergency"];
const VIAS: ("WhatsApp" | "In person" | "Phone")[] = ["WhatsApp", "In person", "Phone"];

export default function RepairForm() {
  const { state, ctBack, setFormField, addPhoto, submitTicket } = useApp();
  const { all } = useDerived();
  const form = state.form;

  const match = all.find((u) => u.label.toLowerCase() === form.unit.trim().toLowerCase());
  const tenantHint = !match
    ? "Recent: FH-204 · RV-108 · CC-205"
    : match.tenant
    ? `Tenant on lease: ${match.tenant} · ${match.phone}`
    : `${match.label} is vacant — logging as a void repair`;

  const photos = Array.from({ length: form.photos }, (_, i) => (i === 0 ? "tenant photo" : `photo ${i + 1}`));

  return (
    <div className="flex-1" style={{ background: "#f3f2f2" }}>
      <div className="py-3.5 px-4 flex justify-between items-center" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="text-xl font-extrabold tracking-tight">New repair</div>
        <button type="button" onClick={ctBack} className="btn text-[13px] p-1.5" style={{ color: "#ae1800" }}>
          Cancel
        </button>
      </div>
      <div className="p-4 grid gap-4">
        <div className="grid gap-[5px]">
          <span className="field-label">Unit</span>
          <input
            className="tabnum input text-[17px] p-3"
            style={{ background: "#f8f4f4" }}
            placeholder="Type or scan unit number"
            value={form.unit}
            onChange={(e) => setFormField({ unit: e.target.value })}
          />
          <div className="text-xs" style={{ color: "#605d5d" }}>{tenantHint}</div>
        </div>
        <div className="grid gap-1.5">
          <span className="field-label">Category</span>
          <div className="grid grid-cols-3 gap-1.5">
            {CATS.map((c) => {
              const active = form.cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormField({ cat: c })}
                  className="btn text-left text-[13px] px-2.5 py-3.5 border"
                  style={{
                    minHeight: 52,
                    background: active ? "#201e1d" : "#f8f4f4",
                    color: active ? "#f3f2f2" : "#201e1d",
                    borderColor: "var(--hairline)",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-[5px]">
          <span className="field-label">What is wrong</span>
          <textarea
            className="input"
            style={{ background: "#f8f4f4" }}
            rows={3}
            placeholder="Paste the WhatsApp message or type it"
            value={form.desc}
            onChange={(e) => setFormField({ desc: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <span className="field-label">Photos</span>
          <div className="flex gap-2 flex-wrap">
            {photos.map((label, i) => (
              <div key={i} className="photo-slot" style={{ width: 88, height: 88 }}>
                <span className="text-[9px]" style={{ fontFamily: "ui-monospace,Menlo,monospace", color: "#605d5d" }}>
                  {label}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={addPhoto}
              className="btn flex items-end p-1.5 text-xs font-extrabold border-2"
              style={{ width: 88, height: 88, borderColor: "rgba(32,30,29,.4)", borderStyle: "dashed", borderRadius: 10 }}
            >
              Camera +
            </button>
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="field-label">Urgency</span>
          <div className="segmented">
            {URGENCIES.map((u) => {
              const active = form.urgency === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFormField({ urgency: u })}
                  className="btn seg-btn flex-1 text-left text-sm px-3 py-3"
                  style={{
                    minHeight: 48,
                    background: active ? (u === "Emergency" ? "#ec3013" : "#201e1d") : "transparent",
                    color: active ? "#f3f2f2" : "#201e1d",
                  }}
                >
                  {u}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="field-label">Reported via</span>
          <div className="segmented">
            {VIAS.map((v) => {
              const active = form.via === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormField({ via: v })}
                  className="btn seg-btn flex-1 text-left text-[13px] px-2.5 py-[11px]"
                  style={{
                    minHeight: 44,
                    background: active ? "#201e1d" : "transparent",
                    color: active ? "#f3f2f2" : "#201e1d",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={submitTicket} className="btn btn-primary block w-full text-left text-[17px] p-4 mt-1">
          {state.offline ? "Save to outbox — will sync" : "Submit repair"}
        </button>
        <div className="text-xs" style={{ color: "#605d5d" }}>
          No cost or rent fields here — a caretaker session never receives them.
        </div>
      </div>
    </div>
  );
}
