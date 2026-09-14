"use client";

import { useApp, useDerived } from "@/lib/store";
import type { InspectionCondition, InspectionType } from "@/lib/types";

const TYPES: InspectionType[] = ["Move-in", "Move-out"];
const CONDITIONS: InspectionCondition[] = ["Good", "Fair", "Damage noted"];

export default function InspectionForm() {
  const { state, ctBack, setInspectField, addInspectPhoto, submitInspection } = useApp();
  const { all } = useDerived();
  const inspect = state.inspect;

  const match = all.find((u) => u.label.toLowerCase() === inspect.unit.trim().toLowerCase());
  const tenantHint = !match
    ? "Recent: FH-107 · RV-204 · CC-102"
    : match.tenant
    ? `Tenant on lease: ${match.tenant}`
    : `${match.label} is vacant`;

  const photos = Array.from({ length: inspect.photos }, (_, i) => (i === 0 ? "unit photo" : `photo ${i + 1}`));

  return (
    <div className="flex-1" style={{ background: "#f3f2f2" }}>
      <div className="py-3.5 px-4 border-b-2 flex justify-between items-center" style={{ borderColor: "rgba(32,30,29,.4)" }}>
        <div className="text-xl font-extrabold tracking-tight">New inspection</div>
        <button type="button" onClick={ctBack} className="btn text-[13px] p-1.5" style={{ color: "#ae1800" }}>
          Cancel
        </button>
      </div>
      <div className="p-4 grid gap-4">
        <div className="grid gap-1.5">
          <span className="field-label">Type</span>
          <div className="flex border" style={{ borderColor: "rgba(32,30,29,.4)" }}>
            {TYPES.map((ty) => {
              const active = inspect.type === ty;
              return (
                <button
                  key={ty}
                  type="button"
                  onClick={() => setInspectField({ type: ty })}
                  className="btn flex-1 text-left text-sm px-3 py-3 border-r"
                  style={{
                    minHeight: 48,
                    borderColor: "rgba(32,30,29,.25)",
                    background: active ? "#201e1d" : "transparent",
                    color: active ? "#f3f2f2" : "#201e1d",
                  }}
                >
                  {ty}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-[5px]">
          <span className="field-label">Unit</span>
          <input
            className="tabnum input text-[17px] p-3"
            style={{ background: "#f8f4f4" }}
            placeholder="Type or scan unit number"
            value={inspect.unit}
            onChange={(e) => setInspectField({ unit: e.target.value })}
          />
          <div className="text-xs" style={{ color: "#605d5d" }}>{tenantHint}</div>
        </div>
        <div className="grid gap-1.5">
          <span className="field-label">Condition</span>
          <div className="flex border" style={{ borderColor: "rgba(32,30,29,.4)" }}>
            {CONDITIONS.map((c) => {
              const active = inspect.condition === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setInspectField({ condition: c })}
                  className="btn flex-1 text-left text-[13px] px-2.5 py-[11px] border-r"
                  style={{
                    minHeight: 44,
                    borderColor: "rgba(32,30,29,.25)",
                    background: active ? (c === "Damage noted" ? "#ec3013" : "#201e1d") : "transparent",
                    color: active ? "#f3f2f2" : "#201e1d",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-[5px]">
          <span className="field-label">Notes</span>
          <textarea
            className="input"
            style={{ background: "#f8f4f4" }}
            rows={3}
            placeholder="Walls, fittings, fixtures, meter reading"
            value={inspect.notes}
            onChange={(e) => setInspectField({ notes: e.target.value })}
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
              onClick={addInspectPhoto}
              className="btn flex items-end p-1.5 text-xs font-extrabold border-2"
              style={{ width: 88, height: 88, borderColor: "#201e1d" }}
            >
              Camera +
            </button>
          </div>
        </div>
        <button type="button" onClick={submitInspection} className="btn btn-primary block w-full text-left text-[17px] p-4 mt-1">
          {state.offline ? "Save to outbox — will sync" : "Submit inspection"}
        </button>
        <div className="text-xs" style={{ color: "#605d5d" }}>
          A move-out inspection with damage noted attaches to the tenant&apos;s offboarding checklist automatically.
        </div>
      </div>
    </div>
  );
}
