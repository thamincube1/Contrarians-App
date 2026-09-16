"use client";

import { useEffect } from "react";

/** Registers public/sw.js once on mount. Renders nothing. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support degrades gracefully without a service worker —
      // the IndexedDB outbox and online-event flush still work, just
      // without the cached app shell or Background Sync wake-up.
    });
  }, []);

  return null;
}
