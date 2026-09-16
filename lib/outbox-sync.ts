"use client";

// Flushes the offline outbox (lib/outbox.ts) through the real server
// actions, in FIFO order, with capped exponential backoff per item. Called
// on enqueue, on the browser's `online` event, on a periodic timer (catches
// transient failures that aren't connectivity-related), and when the
// service worker wakes the page after a Background Sync event.
import { submitInspectionAction, submitTicketAction } from "./actions";
import type { InspectFormState, Inspection, RepairFormState } from "./types";
import { listOutbox, removeOutboxItem, updateOutboxItem, type OutboxItem } from "./outbox";

const BACKOFF_MS = [1000, 3000, 8000, 20000, 60000];
const SYNCED_DISPLAY_MS = 2500; // how long a "Synced" row lingers before it's removed

let flushing = false;
const listeners = new Set<(items: OutboxItem[]) => void>();

export function subscribeOutbox(fn: (items: OutboxItem[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function refreshOutbox(): Promise<void> {
  const items = await listOutbox();
  listeners.forEach((fn) => fn(items));
}

function backoffElapsed(item: OutboxItem): boolean {
  if (item.attempts === 0) return true;
  const delay = BACKOFF_MS[Math.min(item.attempts - 1, BACKOFF_MS.length - 1)];
  return Date.now() - (item.lastAttemptAt ?? 0) >= delay;
}

export async function flushOutbox(onInspectionSynced?: (row: Inspection) => void): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;

  try {
    const items = await listOutbox();
    for (const item of items) {
      if (item.status === "synced" || item.status === "syncing") continue;
      if (!backoffElapsed(item)) continue;

      await updateOutboxItem(item.id, { status: "syncing" });
      await refreshOutbox();

      try {
        if (item.kind === "ticket") {
          const result = await submitTicketAction({ ...(item.payload as RepairFormState), clientId: item.id });
          if (!result.ok) throw new Error(result.reason ?? "Failed to submit repair");
        } else {
          const result = await submitInspectionAction({ ...(item.payload as InspectFormState), clientId: item.id });
          if (!result.ok) throw new Error(result.reason ?? "Failed to submit inspection");
          if (result.row) onInspectionSynced?.(result.row);
        }

        await updateOutboxItem(item.id, { status: "synced" });
        await refreshOutbox();
        setTimeout(() => {
          void removeOutboxItem(item.id).then(refreshOutbox);
        }, SYNCED_DISPLAY_MS);
      } catch (err) {
        await updateOutboxItem(item.id, {
          status: "failed",
          attempts: item.attempts + 1,
          lastAttemptAt: Date.now(),
          lastError: err instanceof Error ? err.message : "Sync failed",
        });
        await refreshOutbox();
      }
    }
  } finally {
    flushing = false;
  }
}
