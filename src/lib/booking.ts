export const BOOKING_STATUSES = [
  "BOOKED",
  "AWAITING_STOCK",
  "STOCK_AVAILABLE",
  "ALLOCATED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  BOOKED: "Booked",
  AWAITING_STOCK: "Awaiting Stock",
  STOCK_AVAILABLE: "Stock Available",
  ALLOCATED: "Tractor Allocated",
  READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_MODES = ["Cash", "Bank", "UPI", "Cheque", "Other"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  Cash: "Cash",
  Bank: "Bank Transfer",
  UPI: "UPI",
  Cheque: "Cheque",
  Other: "Other",
};

export const PAYMENT_TYPES = ["BOOKING", "ADVANCE", "BALANCE", "OTHER", "REFUND"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  BOOKING: "Booking amount",
  ADVANCE: "Advance",
  BALANCE: "Balance payment",
  OTHER: "Other receipt",
  REFUND: "Refund",
};

export const LEDGER_TYPE_LABEL: Record<string, string> = {
  OPENING: "Opening balance",
  DEAL: "Deal price",
  BOOKING: "Booking amount",
  ADVANCE: "Advance",
  BALANCE: "Balance payment",
  OTHER_CHARGE: "Other charge",
  OTHER_RECEIPT: "Other receipt",
  REFUND: "Refund",
};

/** Booking-amount collection state (deal balance is tracked separately). */
export function bookingPaymentState(received: number, bookingAmount: number) {
  if (received <= 0) return "Pending";
  if (received < bookingAmount) return "Partially received";
  return "Fully received";
}
