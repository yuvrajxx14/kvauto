import type { Database } from "@/integrations/supabase/types";

export type InquiryStatus = Database["public"]["Enums"]["inquiry_status"];
export type InterestLevel = Database["public"]["Enums"]["interest_level"];
export type CustomerType = Database["public"]["Enums"]["customer_type"];
export type ContactMethod = Database["public"]["Enums"]["contact_method"];
export type DemoStatus = Database["public"]["Enums"]["demo_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentMode = Database["public"]["Enums"]["payment_mode"];

export const PIPELINE: InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "DEMO",
  "NEGOTIATION",
  "BOOKED",
  "DELIVERED",
];

export const ALL_STATUSES: InquiryStatus[] = [...PIPELINE, "LOST"];

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  DEMO: "Demo",
  NEGOTIATION: "Negotiation",
  BOOKED: "Booked",
  DELIVERED: "Delivered",
  LOST: "Lost",
};

export const LEAD_SOURCES = [
  "Walk-in",
  "Existing Customer",
  "Reference",
  "Village Visit",
  "Phone Call",
  "WhatsApp",
  "Website",
  "Advertisement",
  "Camp/Event",
  "Other",
] as const;

export const CUSTOMER_TYPES: CustomerType[] = ["Farmer", "Contractor", "Commercial", "Other"];

export const CONTACT_METHODS: ContactMethod[] = [
  "Phone",
  "WhatsApp",
  "Visit",
  "Showroom Visit",
  "Demo",
  "Other",
];

export const INTEREST_LEVELS: InterestLevel[] = ["HOT", "WARM", "COLD"];

export const PAYMENT_MODES: PaymentMode[] = ["Cash", "Bank", "UPI", "Cheque"];

export const LOST_REASONS = [
  "Price",
  "Competitor",
  "Finance Issue",
  "Subsidy Issue",
  "No Requirement",
  "Delayed Purchase",
  "Purchased Elsewhere",
  "Customer Not Responding",
  "Other",
] as const;

/** Common Mahindra tractor line-up used by the dealership. */
export const TRACTOR_MODELS = [
  { model: "JIVO 225 DI", hp: "20 HP" },
  { model: "JIVO 245 DI", hp: "24 HP" },
  { model: "JIVO 305 DI", hp: "30 HP" },
  { model: "YUVO TECH+ 275", hp: "35 HP" },
  { model: "YUVO TECH+ 405", hp: "40 HP" },
  { model: "YUVO TECH+ 415", hp: "42 HP" },
  { model: "275 DI TU", hp: "35 HP" },
  { model: "575 DI", hp: "45 HP" },
  { model: "575 DI XP PLUS", hp: "47 HP" },
  { model: "ARJUN NOVO 605 DI-i", hp: "57 HP" },
  { model: "ARJUN NOVO 605 DI-PS", hp: "57 HP" },
  { model: "NOVO 755 DI", hp: "74 HP" },
  { model: "OJA 2127", hp: "27 HP" },
  { model: "OJA 3140", hp: "40 HP" },
] as const;

export const VARIANTS = ["2WD", "4WD", "Power Steering", "Manual Steering", "Special"] as const;

export const PURCHASE_PURPOSES = [
  "Farming",
  "Haulage / Trolley",
  "Rotavator / Implements",
  "Commercial Rental",
  "Construction",
  "Other",
] as const;

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  BOOKED: "Booked",
  ALLOCATED: "Tractor Allocated",
  READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function inr(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ACTIVE_STATUSES: InquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "DEMO",
  "NEGOTIATION",
];
