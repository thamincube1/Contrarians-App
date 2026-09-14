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
    <div className="grid gap-0" style={{ gridTemplateColumns: "minmax(0,390px) minmax(0,1fr)", minHeight: "calc(100vh - 51px)" }}>
      <div className="border-r-2 flex flex-col" style={{ borderColor: "rgba(32,30,29,.4)", background: "#eae9e9" }}>
        <div
          className="py-2.5 px-4 border-b flex justify-between items-center text-[11px] tracking-[0.08em] uppercase"
          style={{ borderColor: "rgba(32,30,29,.25)", color: "#605d5d" }}
        >
          <span>Caretaker · installed to home screen</span>
          <span className="font-extrabold" style={{ color: state.offline ? "#ae1800" : "#605d5d" }}>
            {state.offline ? "Offline · 2 waiting to upload" : "Synced"}
          </span>
        </div>
        {state.ct === "home" && <Home />}
        {state.ct === "form" && <RepairForm />}
        {state.ct === "inspect" && <InspectionForm />}
        {state.ct === "detail" && <TicketDetail />}
      </div>
      <DesignNotes />
    </div>
  );
}
