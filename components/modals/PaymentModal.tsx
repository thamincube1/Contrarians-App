"use client";

import { useApp } from "@/lib/store";

export default function PaymentModal() {
  const { state, closePayment, setPayAmount, savePayment } = useApp();

  if (!state.payOpen) return null;

  return (
    <div
      onClick={closePayment}
      className="modal-backdrop fixed inset-0 flex items-center justify-center p-6 z-[60]"
    >
      <div onClick={(e) => e.stopPropagation()} className="modal-panel w-[420px] max-w-full">
        <div className="py-[18px] px-[22px] pb-3.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
            Manual entry · bank reconciliation
          </div>
          <div className="text-[22px] font-extrabold tracking-tight mt-[3px]">Record a payment</div>
        </div>
        <div className="py-4 px-[22px] grid gap-3">
          <label className="grid gap-1">
            <span className="field-label">Amount received (R)</span>
            <input
              className="tabnum input"
              style={{ background: "#f8f4f4" }}
              value={state.payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </label>
          <div className="text-xs pl-2.5" style={{ color: "#444141", borderLeft: "2px solid #ec3013" }}>
            Allocated oldest-invoice-first, posted as a credit to the ledger, receipt emailed.
          </div>
        </div>
        <div className="py-3 px-[22px] pb-4.5 flex gap-2" style={{ borderTop: "1px solid var(--hairline)" }}>
          <button type="button" onClick={savePayment} className="btn btn-primary text-sm px-4 py-2.5">
            Post to ledger
          </button>
          <button type="button" onClick={closePayment} className="btn btn-secondary text-sm px-4 py-2.5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
