"use client";

import { useApp } from "@/lib/store";
import Home from "./Home";
import RepairForm from "./RepairForm";
import InspectionForm from "./InspectionForm";
import TicketDetail from "./TicketDetail";
import DesignNotes from "./DesignNotes";

export default function CaretakerShell() {
  const { state } = useApp();

  return (
    <div className="grid gap-4 p-4" style={{ gridTemplateColumns: "minmax(0,390px) minmax(0,1fr)", minHeight: "calc(100vh - 67px)" }}>
      <div
        className="flex flex-col rounded-[28px] overflow-hidden"
        style={{ background: "#eae9e9", boxShadow: "var(--shadow-md)", border: "1px solid var(--hairline-soft)" }}
      >
        <div
          className="chrome-blur py-2.5 px-4 flex justify-between items-center text-[11px] tracking-[0.08em] uppercase"
          style={{ borderBottom: "1px solid var(--hairline-soft)", color: "#605d5d" }}
        >
          <span>Caretaker · installed to home screen</span>
          <span className="font-extrabold" style={{ color: state.offline ? "#ae1800" : "#605d5d" }}>
            {state.offline ? "Offline · 2 waiting to upload" : "Synced"}
          </span>
        </div>
        <div key={state.ct} className="flex flex-col flex-1 animate-in">
          {state.ct === "home" && <Home />}
          {state.ct === "form" && <RepairForm />}
          {state.ct === "inspect" && <InspectionForm />}
          {state.ct === "detail" && <TicketDetail />}
        </div>
      </div>
      <DesignNotes />
    </div>
  );
}
