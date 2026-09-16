"use client";

import { useApp } from "@/lib/store";
import Tag from "@/components/ui/Tag";
import type { OutboxItem, OutboxStatus } from "@/lib/outbox";
import type { InspectFormState, RepairFormState } from "@/lib/types";

const STATUS_TAG: Record<OutboxStatus, [string, string, string]> = {
  pending: ["#d7d3d3", "#444141", "Queued"],
  syncing: ["#201e1d", "#f3f2f2", "Syncing…"],
  synced: ["#eae9e9", "#2d2b2b", "Synced"],
  failed: ["#ffc4b8", "#7c1405", "Retrying"],
};

function summarize(item: OutboxItem): { title: string; subtitle: string } {
  if (item.kind === "ticket") {
    const p = item.payload as RepairFormState;
    return { title: (p.unit || "Unassigned unit").toUpperCase(), subtitle: p.cat + " repair" };
  }
  const p = item.payload as InspectFormState;
  return { title: (p.unit || "Unassigned unit").toUpperCase(), subtitle: p.type + " inspection" };
}

/**
 * Shows every repair/inspection sitting in the offline outbox (lib/outbox.ts)
 * so a caretaker working with no signal can see their submissions queued
 * rather than wondering if they silently vanished. Hidden entirely once the
 * outbox is empty — everything has synced.
 */
export default function Outbox() {
  const { outbox } = useApp();

  if (outbox.length === 0) return null;

  return (
    <div className="px-4 pb-1.5">
      <div className="py-3.5 pb-1.5 text-[11px] font-extrabold tracking-[0.08em] uppercase">
        Outbox · {outbox.length} pending
      </div>
      <div className="grid gap-2">
        {outbox.map((item) => {
          const [bg, fg, label] = STATUS_TAG[item.status];
          const { title, subtitle } = summarize(item);
          return (
            <div
              key={item.id}
              className="card px-4 py-[13px]"
              style={{ minHeight: 56, opacity: item.status === "synced" ? 0.6 : 1 }}
            >
              <div className="flex justify-between gap-2 items-baseline">
                <span className="text-base font-extrabold tracking-tight">{title}</span>
                <Tag label={label} bg={bg} fg={fg} />
              </div>
              <div className="text-sm mt-0.5">{subtitle}</div>
              {item.status === "failed" && item.lastError && (
                <div className="text-xs mt-px" style={{ color: "#ae1800" }}>
                  {item.lastError} · will retry automatically
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
