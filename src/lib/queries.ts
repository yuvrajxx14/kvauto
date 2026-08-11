import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; full_name: string; email: string | null; phone: string | null };

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useProfileMap() {
  const { data } = useProfiles();
  const map = new Map<string, string>();
  (data ?? []).forEach((p) => map.set(p.id, p.full_name));
  return map;
}

export const INQUIRY_SELECT =
  "*, customer:customers(id, customer_name, mobile, village, taluka, district, customer_type)";

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

export function useFollowups(inquiryId?: string) {
  return useQuery({
    queryKey: ["followups", inquiryId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("followups")
        .select("*, inquiry:inquiries(id, inquiry_number, model, status), customer:customers(id, customer_name, mobile, village)")
        .order("followup_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (inquiryId) q = q.eq("inquiry_id", inquiryId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDemos(inquiryId?: string) {
  return useQuery({
    queryKey: ["demos", inquiryId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("demos")
        .select("*, inquiry:inquiries(id, inquiry_number, status), customer:customers(id, customer_name, mobile, village)")
        .order("demo_date", { ascending: false });
      if (inquiryId) q = q.eq("inquiry_id", inquiryId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNegotiations(inquiryId?: string) {
  return useQuery({
    queryKey: ["negotiations", inquiryId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("negotiations")
        .select("*, inquiry:inquiries(id, inquiry_number, status, salesman_id, customer:customers(id, customer_name, mobile, village))")
        .order("created_at", { ascending: false });
      if (inquiryId) q = q.eq("inquiry_id", inquiryId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const BOOKING_SELECT =
  "*, customer:customers(id, customer_name, mobile, village), inquiry:inquiries(id, inquiry_number), allocation:tractor_allocations(*)";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, inquiries(id, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

export function useLostInfo(inquiryId: string) {
  return useQuery({
    queryKey: ["lost", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lost_inquiries")
        .select("*")
        .eq("inquiry_id", inquiryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePayments(bookingId: string) {
  return useQuery({
    queryKey: ["payments", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
