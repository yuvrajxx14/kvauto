export const STOCK_STATUSES = [
  "ORDERED",
  "IN_TRANSIT",
  "RECEIVED",
  "INSPECTION_PENDING",
  "PDI_PENDING",
  "INSPECTION_FAILED",
  "AVAILABLE",
  "RESERVED",
  "ALLOCATED",
  "DELIVERED",
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  ORDERED: "Ordered",
  IN_TRANSIT: "In Transit",
  RECEIVED: "Received",
  INSPECTION_PENDING: "Inspection Pending",
  PDI_PENDING: "PDI Pending",
  INSPECTION_FAILED: "Inspection Failed",
  AVAILABLE: "Ready for Delivery",
  RESERVED: "Reserved",
  ALLOCATED: "Allocated",
  DELIVERED: "Delivered",
};

export const CHECK_STATUSES = ["PENDING", "PASSED", "FAILED"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const CHECK_LABEL: Record<CheckStatus, string> = {
  PENDING: "Pending",
  PASSED: "Passed",
  FAILED: "Failed",
};

export const ORDER_STATUSES = [
  "DRAFT",
  "APPROVED",
  "ORDERED",
  "IN_TRANSIT",
  "RECEIVED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  ORDERED: "Ordered",
  IN_TRANSIT: "In Transit",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const STOCK_LOCATIONS = ["Main Showroom", "Yard", "Workshop", "In Transit"] as const;

export const TRACTOR_COLOURS = ["Mahindra Red", "Red", "Blue", "Other"] as const;

/** Statuses counted as physically on hand and sellable. */
export const AVAILABLE_STATUSES: StockStatus[] = ["AVAILABLE"];
export const INCOMING_STATUSES: StockStatus[] = ["ORDERED", "IN_TRANSIT"];
export const HELD_STATUSES: StockStatus[] = ["RESERVED", "ALLOCATED"];
export const PIPELINE_CHECK_STATUSES: StockStatus[] = [
  "RECEIVED",
  "INSPECTION_PENDING",
  "PDI_PENDING",
];

export type DemandRow = {
  model: string;
  available: number;
  reserved: number;
  allocated: number;
  incoming: number;
  bookedDemand: number;
  pendingDemand: number;
  minRegular: number;
  requiredForBookings: number;
  requiredForRegular: number;
  suggestedOrder: number;
  orderRequired: boolean;
  belowMinimum: boolean;
};
