import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SERVICE_TYPES = ["GENERAL", "PROBLEM"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];
export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  GENERAL: "General service",
  PROBLEM: "Problem / Complaint",
};

export const PROBLEM_CATEGORIES = [
  "Engine",
  "Hydraulic",
  "Transmission / Clutch",
  "Electrical",
  "Brakes / Steering",
  "Body / Other",
] as const;

export const SERVICE_MODES = ["IN_HOUSE", "FIELD_VISIT"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];
export const SERVICE_MODE_LABEL: Record<ServiceMode, string> = {
  IN_HOUSE: "Workshop (in-house)",
  FIELD_VISIT: "Field visit",
};

export const SERVICE_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];
export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  AWAITING_PARTS: "Awaiting parts",
  COMPLETED: "Completed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const OPEN_STATUSES: ServiceStatus[] = ["OPEN", "IN_PROGRESS", "AWAITING_PARTS"];

export const PRIORITIES = ["URGENT", "HIGH", "NORMAL"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  NORMAL: "Normal",
};
export const PRIORITY_RANK: Record<Priority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2 };

export type ServiceJob = {
  id: string;
  job_number: string;
  customer_id: string | null;
  customer_name: string;
  mobile: string;
  village: string;
  taluka: string | null;
  model: string | null;
  chassis_number: string | null;
  registration_number: string | null;
  hours_reading: number | null;
  service_type: string;
  problem_category: string | null;
  service_mode: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  received_date: string;
  promised_date: string | null;
  completed_date: string | null;
  planned_visit_date: string | null;
  complaint: string | null;
  work_done: string | null;
  parts_details: string | null;
  parts_amount: number;
  labour_amount: number;
  total_amount: number;
  remarks: string | null;
  created_at: string;
};

/** Problem jobs first, then priority, then oldest promised/received date. */
export function sortServiceJobs(jobs: ServiceJob[]): ServiceJob[] {
  return [...jobs].sort((a, b) => {
    const at = a.service_type === "PROBLEM" ? 0 : 1;
    const bt = b.service_type === "PROBLEM" ? 0 : 1;
    if (at !== bt) return at - bt;
    const ap = PRIORITY_RANK[a.priority as Priority] ?? 9;
    const bp = PRIORITY_RANK[b.priority as Priority] ?? 9;
    if (ap !== bp) return ap - bp;
    const ad = a.promised_date ?? a.received_date;
    const bd = b.promised_date ?? b.received_date;
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });
}

export function isOverdue(job: ServiceJob) {
  if (!job.promised_date) return false;
  if (!OPEN_STATUSES.includes(job.status as ServiceStatus)) return false;
  return job.promised_date < new Date().toISOString().slice(0, 10);
}

export function useServiceJobs() {
  return useQuery({
    queryKey: ["service-jobs"],
    queryFn: async (): Promise<ServiceJob[]> => {
      const { data, error } = await supabase
        .from("service_jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ServiceJob[];
    },
  });
}

export function useServiceJob(id: string) {
  return useQuery({
    queryKey: ["service-job", id],
    queryFn: async (): Promise<ServiceJob | null> => {
      const { data, error } = await supabase.from("service_jobs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ServiceJob | null;
    },
    enabled: !!id,
  });
}

export type ServiceRoute = {
  id: string;
  route_number: string;
  visit_date: string;
  assigned_to: string | null;
  villages: string[];
  status: string;
  remarks: string | null;
  created_at: string;
};

export function useServiceRoutes() {
  return useQuery({
    queryKey: ["service-routes"],
    queryFn: async (): Promise<ServiceRoute[]> => {
      const { data, error } = await supabase
        .from("service_routes")
        .select("*")
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ServiceRoute[];
    },
  });
}

export function useServiceRoute(id: string) {
  return useQuery({
    queryKey: ["service-route", id],
    queryFn: async () => {
      const [{ data: route, error: rErr }, { data: stops, error: sErr }] = await Promise.all([
        supabase.from("service_routes").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("service_route_stops")
          .select("*, job:service_jobs(*)")
          .eq("route_id", id)
          .order("visit_order", { ascending: true }),
      ]);
      if (rErr) throw rErr;
      if (sErr) throw sErr;
      return {
        route: (route ?? null) as unknown as ServiceRoute | null,
        stops: (stops ?? []) as unknown as { id: string; village: string; visit_order: number; job: ServiceJob }[],
      };
    },
    enabled: !!id,
  });
}

/** Pending field-visit jobs grouped by village, priority villages first. */
export function villageDemand(jobs: ServiceJob[]) {
  const pending = jobs.filter(
    (j) => j.service_mode === "FIELD_VISIT" && OPEN_STATUSES.includes(j.status as ServiceStatus),
  );
  const map = new Map<string, ServiceJob[]>();
  pending.forEach((j) => {
    const key = j.village || "Unknown";
    map.set(key, [...(map.get(key) ?? []), j]);
  });
  return [...map.entries()]
    .map(([village, list]) => {
      const problems = list.filter((j) => j.service_type === "PROBLEM").length;
      const oldest = list.reduce((min, j) => (j.received_date < min ? j.received_date : min), list[0]!.received_date);
      const days = Math.max(
        0,
        Math.round((Date.now() - new Date(oldest).getTime()) / 86_400_000),
      );
      return { village, jobs: sortServiceJobs(list), total: list.length, problems, oldest, days };
    })
    .sort((a, b) => b.problems - a.problems || b.days - a.days || a.village.localeCompare(b.village));
}
