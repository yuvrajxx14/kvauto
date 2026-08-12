import type { Database } from "@/integrations/supabase/types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentMode = Database["public"]["Enums"]["payment_mode"];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  BOOKED: "Booked",
  ALLOCATED: "Tractor Allocated",
  READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const BOOKING_STATUSES: BookingStatus[] = [
  "BOOKED",
  "ALLOCATED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export const PAYMENT_MODES: PaymentMode[] = [
  "Cash",
  "Bank",
  "UPI",
  "Cheque",
  "Other",
];

export function bookingPaymentState(received: number, bookingAmount: number) {
  if (received <= 0) return "Pending";
  if (received < bookingAmount) return "Partially received";
  return "Fully received";
}
