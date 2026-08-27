import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; full_name: string; email: string | null; phone: string | null };

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      // Contact details come back only for management (or your own row) — enforced server-side.
      const { data, error } = await supabase.rpc("staff_directory" as never);
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
    staleTime: 60_000,
  });
}

export type StaffWithRoles = { id: string; full_name: string; roles: string[] };

/** Staff list including roles — used by assignment pickers so only the right role is offered. */
export function useStaffWithRoles() {
  return useQuery({
    queryKey: ["staff-roles"],
    queryFn: async (): Promise<StaffWithRoles[]> => {
      const { data, error } = await supabase.rpc("staff_directory_roles" as never);
      if (error) throw error;
      return (data ?? []) as unknown as StaffWithRoles[];
    },
    staleTime: 60_000,
  });
}

export function useSalesStaff() {
  const q = useStaffWithRoles();
  const list = (q.data ?? []).filter((p) => p.roles.some((r) => ["salesman", "sales_manager"].includes(r)));
  // Fallback: if no salesman exists yet, allow management to be picked
  return { ...q, data: list.length > 0 ? list : (q.data ?? []).filter((p) => p.roles.some((r) => ["ceo", "manager"].includes(r))) };
}

export function useTechnicians() {
  const q = useStaffWithRoles();
  const list = (q.data ?? []).filter((p) => p.roles.some((r) => ["mechanic", "service_manager", "workshop_manager"].includes(r)));
  return { ...q, data: list };
}

export function useSparepartStaff() {
  const q = useStaffWithRoles();
  const list = (q.data ?? []).filter((p) => p.roles.some((r) => ["sparepart_manager", "ceo", "manager", "sales_manager"].includes(r)));
  return { ...q, data: list };
}


export function useProfileMap() {
  const { data } = useProfiles();
  const map = new Map<string, string>();
  (data ?? []).forEach((p) => map.set(p.id, p.full_name));
  return map;
}

export const INQUIRY_SELECT =
  "*, customer:customers(id, customer_name, mobile, alternate_mobile, village, taluka, district, customer_type)";

export function useInquiries(opts?: { status?: string; salesmanId?: string }) {
  return useQuery({
    queryKey: ["inquiries", opts?.status ?? "all", opts?.salesmanId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("inquiries").select(INQUIRY_SELECT).order("created_at", { ascending: false });
      if (opts?.status && opts.status !== "all") q = q.eq("status", opts.status as never);
      if (opts?.salesmanId && opts.salesmanId !== "all") q = q.eq("salesman_id", opts.salesmanId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInquiry(id: string) {
  return useQuery({
    queryKey: ["inquiry", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select(INQUIRY_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useActivity(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["activity", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
