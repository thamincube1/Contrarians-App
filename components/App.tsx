"use client";

import { AppProvider, useApp } from "@/lib/store";
import type { InitialData } from "@/lib/data";
import type { Role } from "@/lib/types";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import LandlordShell from "@/components/landlord/LandlordShell";
import CaretakerShell from "@/components/caretaker/CaretakerShell";
import OffboardModal from "@/components/modals/OffboardModal";
import PaymentModal from "@/components/modals/PaymentModal";

function AppBody({ userName }: { userName: string }) {
  const { state } = useApp();
  return (
    <>
      <Header userName={userName} />
      {state.role === "landlord" ? <LandlordShell /> : <CaretakerShell />}
      <OffboardModal />
      <PaymentModal />
      <Toast />
    </>
  );
}

export default function App({ initial, role, userName }: { initial: InitialData; role: Role; userName: string }) {
  return (
    <AppProvider initial={initial} role={role}>
      <AppBody userName={userName} />
    </AppProvider>
  );
}
