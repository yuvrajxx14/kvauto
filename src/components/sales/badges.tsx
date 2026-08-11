import { cn } from "@/lib/utils";
import {
  STATUS_LABEL,
  BOOKING_STATUS_LABEL,
  type InquiryStatus,
  type InterestLevel,
  type BookingStatus,
  type DemoStatus,
} from "@/lib/sales";

const STATUS_CLASS: Record<InquiryStatus, string> = {
  NEW: "bg-info/10 text-info border-info/25",
  CONTACTED: "bg-info/10 text-info border-info/25",
  FOLLOW_UP: "bg-warning/15 text-warning-foreground border-warning/40",
  DEMO: "bg-accent text-accent-foreground border-warning/30",
  NEGOTIATION: "bg-primary/10 text-primary border-primary/25",
  BOOKED: "bg-success/12 text-success border-success/30",
  DELIVERED: "bg-success/20 text-success border-success/40",
  LOST: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: InquiryStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const INTEREST_CLASS: Record<InterestLevel, string> = {
  HOT: "bg-hot/12 text-hot border-hot/30",
  WARM: "bg-warm/15 text-warning-foreground border-warm/35",
  COLD: "bg-cold/12 text-cold border-cold/30",
};

export function InterestBadge({ level }: { level: InterestLevel | null | undefined }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide",
        INTEREST_CLASS[level],
      )}
    >
      {level}
    </span>
  );
}

const BOOKING_CLASS: Record<BookingStatus, string> = {
  BOOKED: "bg-info/10 text-info border-info/25",
  ALLOCATED: "bg-primary/10 text-primary border-primary/25",
  READY_FOR_DELIVERY: "bg-success/12 text-success border-success/30",
  DELIVERED: "bg-success/20 text-success border-success/40",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function BookingBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        BOOKING_CLASS[status],
      )}
    >
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

const DEMO_CLASS: Record<DemoStatus, string> = {
  PLANNED: "bg-info/10 text-info border-info/25",
  COMPLETED: "bg-success/12 text-success border-success/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function DemoBadge({ status }: { status: DemoStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        DEMO_CLASS[status],
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
