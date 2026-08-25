import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SPARE_STATUSES = ["PENDING", "APPROVED", "PARTIAL", "ISSUED", "REJECTED"] as const;
export type SpareStatus = (typeof SPARE_STATUSES)[number];

export const SPARE_STATUS_LABEL: Record<SpareStatus, string> = {
  PENDING: "Requested",
  APPROVED: "Approved by spare manager",
  PARTIAL: "Partially issued",
  ISSUED: "Fully issued",
  REJECTED: "Rejected",
};

export const SPARE_NEXT: Record<SpareStatus, SpareStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["PARTIAL", "ISSUED", "REJECTED"],
  PARTIAL: ["ISSUED", "REJECTED"],
  ISSUED: [],
  REJECTED: ["PENDING"],
};

export const SPARE_REQUEST_TYPES = ["MECHANIC", "CUSTOMER"] as const;
export type SpareRequestType = (typeof SPARE_REQUEST_TYPES)[number];

export const SPARE_TYPE_LABEL: Record<string, string> = {
  MECHANIC: "Mechanic (workshop job)",
  CUSTOMER: "Customer (counter sale)",
};

export const SPARE_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export function spareStatusTone(status: string) {
  switch (status) {
    case "ISSUED":
      return "bg-success/15 text-success";
    case "REJECTED":
      return "bg-destructive/10 text-destructive";
    case "PARTIAL":
      return "bg-warning/15 text-warning";
    case "APPROVED":
      return "bg-primary/15 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export type SpareItem = {
  id: string;
  request_id: string;
  part_name: string;
  part_number: string | null;
  qty_requested: number;
  qty_issued: number;
  rate: number;
  remarks: string | null;
  sort_order: number;
};

const SPARE_SELECT = `
  *,
  items:spare_request_items(*),
  job:service_jobs(id, job_number, customer_name, model),
  customer:customers(id, customer_name, mobile, village)
`;

export function useSpareRequests(opts?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ["spare-requests", opts?.search ?? "", opts?.status ?? "open"],
    queryFn: async () => {
      let q = supabase.from("spare_requests").select(SPARE_SELECT).order("created_at", { ascending: false });
      const term = (opts?.search ?? "").trim();
      if (term) {
        q = q.or(
          `request_number.ilike.%${term}%,requester_name.ilike.%${term}%,mobile.ilike.%${term}%,model.ilike.%${term}%`,
        );
      }
      if (opts?.status && opts.status !== "all" && opts.status !== "open") q = q.eq("status", opts.status);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      if (!opts?.status || opts.status === "open") {
        return rows.filter((r) => !["ISSUED", "REJECTED"].includes(r.status));
      }
      return rows;
    },
  });
}

export function useSpareRequest(id: string) {
  return useQuery({
    queryKey: ["spare-request", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("spare_requests").select(SPARE_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Total value of what was actually issued. */
export function issuedValue(items: { qty_issued: number; rate: number }[]) {
  return items.reduce((s, i) => s + Number(i.qty_issued ?? 0) * Number(i.rate ?? 0), 0);
}

export function requestedValue(items: { qty_requested: number; rate: number }[]) {
  return items.reduce((s, i) => s + Number(i.qty_requested ?? 0) * Number(i.rate ?? 0), 0);
}

/** Derive the fulfilment status from the part lines. */
export function derivedStatus(items: { qty_requested: number; qty_issued: number }[]): SpareStatus | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + Number(i.qty_requested ?? 0), 0);
  const issued = items.reduce((s, i) => s + Math.min(Number(i.qty_issued ?? 0), Number(i.qty_requested ?? 0)), 0);
  if (issued <= 0) return null;
  return issued >= total ? "ISSUED" : "PARTIAL";
}
