export type Role = "landlord" | "caretaker";

export type LandlordScreen =
  | "dashboard"
  | "vacancy"
  | "units"
  | "tickets"
  | "electricity"
  | "inspections"
  | "levies"
  | "tenant"
  | "staff";

export type CaretakerScreen = "home" | "form" | "inspect" | "detail";

export interface PropertyDef {
  id: string;
  name: string;
  prefix: string;
  count: number;
  baseRent: number;
}

export interface Unit {
  id: string;
  label: string;
  property: string;
  propertyId: string;
  rent: number;
  vacant: boolean;
  notice: boolean;
  vacantSince: string | null;
  tenant: string | null;
  balance: number;
  leaseEnd: string;
  moveIn: string;
  phone: string;
  meter: string;
}

export type InspectionType = "Move-in" | "Move-out";
export type InspectionCondition = "Good" | "Fair" | "Damage noted" | "Pending";

export interface Inspection {
  id: string;
  unit: string;
  property: string;
  type: InspectionType;
  date: string;
  tenant: string;
  condition: InspectionCondition;
  caretaker: string;
  photos: number;
}

export interface Levy {
  month: string;
  property: string;
  amount: number;
  note: string;
}

export interface ElectricityPurchase {
  date: string;
  unit: string;
  token: string;
  amount: number;
  kwh: number;
  recharge: boolean;
}

export type TicketStatus = "Logged" | "In progress" | "Awaiting parts" | "Resolved";
export type TicketPriority = "Routine" | "Urgent" | "Emergency";

export interface TicketPhoto {
  label: string;
}

export interface TicketEvent {
  when: string;
  what: string;
}

export interface Ticket {
  id: string;
  unit: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  via: string;
  meta: string;
  desc: string;
  photos: TicketPhoto[];
  timeline: TicketEvent[];
}

export interface StaffMember {
  name: string;
  role: "Landlord" | "Caretaker";
  props: string;
  canClose: string;
  active: string;
}

export interface RepairFormState {
  unit: string;
  cat: string;
  desc: string;
  urgency: TicketPriority;
  via: "WhatsApp" | "In person" | "Phone";
  photos: number;
}

export interface InspectFormState {
  unit: string;
  type: InspectionType;
  condition: InspectionCondition;
  notes: string;
  photos: number;
}

export interface ElecFormState {
  unit: string;
  amount: string;
  kwh: string;
  token: string;
  recharge: boolean;
}

export interface LevyFormState {
  property: string;
  amount: string;
  note: string;
}

export type PurgeMode = "anonymise" | "hard";
