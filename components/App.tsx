"use client";

import { AppProvider, useApp } from "@/lib/store";
import type { InitialData } from "@/lib/data";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import LandlordShell from "@/components/landlord/LandlordShell";
import CaretakerShell from "@/components/caretaker/CaretakerShell";
import OffboardModal from "@/components/modals/OffboardModal";
import PaymentModal from "@/components/modals/PaymentModal";

function AppBody() {
  const { state } = useApp();
  return (
    <>
      <Header />
      {state.role === "landlord" ? <LandlordShell /> : <CaretakerShell />}
      <OffboardModal />
      <PaymentModal />
      <Toast />
    </>
  );
}

export default function App({ initial }: { initial: InitialData }) {
  return (
    <AppProvider initial={initial}>
      <AppBody />
    </AppProvider>
  );
}
