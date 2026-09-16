"use client";

// Client-only IndexedDB queue for the caretaker's repair/inspection forms.
// Every submit — online or offline — writes here first, then a flush
// attempt tries the real server action. This is deliberately one code path
// for both cases (rather than branching on navigator.onLine, which is
// unreliable) — see lib/outbox-sync.ts for the flush/retry logic.
import { openDB, type IDBPDatabase } from "idb";
import type { InspectFormState, RepairFormState } from "./types";

export type OutboxKind = "ticket" | "inspection";
export type OutboxStatus = "pending" | "syncing" | "synced" | "failed";

export interface OutboxItem {
  id: string; // client-generated UUID — also the server's idempotency key
  kind: OutboxKind;
  payload: RepairFormState | InspectFormState;
  status: OutboxStatus;
  attempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  lastError?: string;
}

const DB_NAME = "hauswerk-outbox";
const DB_VERSION = 1;
const STORE = "items";

let dbSingleton: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> | null {
  if (typeof indexedDB === "undefined") return null; // SSR / unsupported browser
  if (!dbSingleton) {
    dbSingleton = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbSingleton;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for browsers without crypto.randomUUID (non-secure contexts).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function enqueue(kind: OutboxKind, payload: RepairFormState | InspectFormState): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: newId(),
    kind,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
  };
  const db = await getDb();
  if (db) await db.put(STORE, item);

  // Durable fallback: ask the browser to wake the service worker (even
  // after this tab closes) once connectivity returns. Best-effort — most
  // of the time the in-page online/interval flush below gets there first.
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        const syncReg = reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
        return syncReg.sync?.register("sync-outbox");
      })
      .catch(() => {});
  }

  return item;
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const db = await getDb();
  if (!db) return [];
  const items: OutboxItem[] = await db.getAll(STORE);
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOutboxItem(id: string, patch: Partial<OutboxItem>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.get(STORE, id);
  if (!existing) return;
  await db.put(STORE, { ...existing, ...patch });
}

export async function removeOutboxItem(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(STORE, id);
}
