import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SERVICE_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_PARTS: "Waiting for parts",
  COMPLETED: "Completed",
  DELIVERED: "Delivered to customer",
  CANCELLED: "Cancelled",
};

/** Allowed forward moves for the job status workflow. */
export const SERVICE_NEXT: Record<ServiceStatus, ServiceStatus[]> = {
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_PARTS", "COMPLETED", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const SERVICE_TYPES = ["GENERAL", "FREE_SERVICE", "PAID_SERVICE", "PROBLEM", "WARRANTY"] as const;
export const SERVICE_TYPE_LABEL: Record<string, string> = {
  GENERAL: "General service",
  FREE_SERVICE: "Free service",
  PAID_SERVICE: "Paid service",
  PROBLEM: "Breakdown / problem",
  WARRANTY: "Warranty",
};

export const SERVICE_MODES = ["IN_HOUSE", "FIELD_VISIT"] as const;
export const SERVICE_MODE_LABEL: Record<string, string> = {
  IN_HOUSE: "In workshop",
  FIELD_VISIT: "Field visit",
};

export const SERVICE_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const PROBLEM_CATEGORIES = [
  "Engine",
  "Hydraulic",
  "Transmission",
  "Electrical",
  "Steering / Brakes",
  "Body / Others",
] as const;

/** Default workshop checklist seeded on every new job. */
export const DEFAULT_SERVICE_CHECKLIST: { item_key: string; label: string }[] = [
  { item_key: "engine_oil", label: "Engine oil level / change" },
  { item_key: "oil_filter", label: "Oil filter checked" },
  { item_key: "air_filter", label: "Air filter cleaned / replaced" },
  { item_key: "fuel_filter", label: "Fuel filter checked" },
  { item_key: "coolant", label: "Coolant / radiator level" },
  { item_key: "hydraulic", label: "Hydraulic oil & lift working" },
  { item_key: "clutch_brake", label: "Clutch & brake adjustment" },
  { item_key: "steering", label: "Steering play checked" },
  { item_key: "battery", label: "Battery & electricals" },
  { item_key: "tyres", label: "Tyre pressure & condition" },
  { item_key: "greasing", label: "Greasing / lubrication" },
  { item_key: "test_run", label: "Final test run" },
];

export const SERVICE_JOB_SELECT =
  "*, customer:customers(id, customer_name, mobile, village), technician:profiles!service_jobs_assigned_to_fkey(id, full_name)";

export function useServiceJobs(opts?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ["service-jobs", opts?.search ?? "", opts?.status ?? "active"],
    queryFn: async () => {
      let q = supabase
        .from("service_jobs")
        .select(SERVICE_JOB_SELECT)
        .order("received_date", { ascending: false });
      const term = (opts?.search ?? "").trim();
      if (term) {
        q = q.or(
          `job_number.ilike.%${term}%,customer_name.ilike.%${term}%,mobile.ilike.%${term}%,registration_number.ilike.%${term}%,chassis_number.ilike.%${term}%`,
        );
      }
      if (opts?.status && opts.status !== "all" && opts.status !== "active") {
        q = q.eq("status", opts.status);
      }
      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      if (!opts?.status || opts.status === "active") {
        return rows.filter((r) => !["DELIVERED", "CANCELLED"].includes(r.status));
      }
      return rows;
    },
  });
}

export function useServiceJob(id: string) {
  return useQuery({
    queryKey: ["service-job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_jobs")
        .select(SERVICE_JOB_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useServiceChecklist(jobId: string) {
  return useQuery({
    queryKey: ["service-checklist", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_checklist")
        .select("*")
        .eq("service_job_id", jobId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!jobId,
  });
}

export async function seedServiceChecklist(jobId: string) {
  const rows = DEFAULT_SERVICE_CHECKLIST.map((c, i) => ({
    service_job_id: jobId,
    item_key: c.item_key,
    label: c.label,
    sort_order: i,
  }));
  const { error } = await supabase.from("service_checklist").upsert(rows, {
    onConflict: "service_job_id,item_key",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

/* ---------------- Route planner ---------------- */

import { DEALER } from "@/lib/print";

/** Dealership start/end point for every field-visit route. */
export const DEALERSHIP_ORIGIN = `${DEALER.name}, ${DEALER.address}`;

export const ROUTE_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const ROUTE_STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "On the road",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Google Maps directions: dealership → each village in order → back to dealership. */
export function googleMapsRouteUrl(villages: string[], region = "Gujarat, India") {
  const stops = villages.filter(Boolean).map((v) => `${v}, ${region}`);
  const params = new URLSearchParams({
    api: "1",
    origin: DEALERSHIP_ORIGIN,
    destination: DEALERSHIP_ORIGIN,
    travelmode: "driving",
  });
  if (stops.length) params.set("waypoints", stops.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsEmbedUrl(villages: string[], region = "Gujarat, India") {
  return googleMapsRouteUrl(villages, region);
}

export const ROUTE_SELECT =
  "*, technician:profiles!service_routes_assigned_to_fkey(id, full_name)";

export function useServiceRoutes() {
  return useQuery({
    queryKey: ["service-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_routes")
        .select(ROUTE_SELECT)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRouteStops(routeId: string) {
  return useQuery({
    queryKey: ["service-route-stops", routeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_route_stops")
        .select("*, job:service_jobs(id, job_number, customer_name, mobile, village, status, complaint)")
        .eq("route_id", routeId)
        .order("visit_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!routeId,
  });
}

/** Field-visit jobs that still need to be visited, for route planning. */
export function usePendingFieldJobs() {
  return useQuery({
    queryKey: ["service-field-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_jobs")
        .select("id, job_number, customer_name, mobile, village, taluka, status, priority, complaint, planned_visit_date")
        .eq("service_mode", "FIELD_VISIT")
        .not("status", "in", "(COMPLETED,DELIVERED,CANCELLED)")
        .order("village");
      if (error) throw error;
      return data ?? [];
    },
  });
}
