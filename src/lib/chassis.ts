import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Appearance settings for a chassis digital reference rendering. */
export type ChassisAppearance = {
  size: number; // 1 small .. 3 large
  spacing: number; // 1 compact .. 3 wide
  stretch: number; // 90 .. 150 (%)
  texture: "CLEAN" | "LIGHT" | "MEDIUM" | "HEAVY";
  distress: "LOW" | "MEDIUM" | "HIGH";
  pressure: number; // 1 low .. 3 high
  rotation: number; // 0 .. 3 degrees
};

export const DEFAULT_APPEARANCE: ChassisAppearance = {
  size: 2,
  spacing: 2,
  stretch: 115,
  texture: "MEDIUM",
  distress: "MEDIUM",
  pressure: 2,
  rotation: 1,
};

export const TEXTURE_OPTIONS = ["CLEAN", "LIGHT", "MEDIUM", "HEAVY"] as const;
export const DISTRESS_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

/** Chassis numbers are alphanumeric (plus - and /) and always upper case. */
export function normalizeChassis(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9\-/]/g, "").trim();
}

export function chassisError(value: string): string | null {
  if (!value) return "Chassis number is required";
  if (value.length < 5) return "Chassis number looks too short";
  if (value.length > 30) return "Chassis number looks too long";
  return null;
}

/** Deterministic pseudo-random in [0,1) from a string seed + index. */
export function seeded(seed: string, index: number, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  h = Math.imul(h ^ (index + 0x9e3779b9), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/* ---------- data hooks ---------- */

const STOCK_SEARCH_SELECT = `
  id, chassis_number, engine_number, model, variant, status,
  allocation:tractor_allocations(
    booking_id,
    booking:bookings(id, booking_number, customer_id, customer:customers(id, customer_name, mobile, village))
  ),
  delivery:deliveries(id, delivery_date)
`;

export function useVehicleSearch(term: string) {
  return useQuery({
    queryKey: ["chassis-vehicle-search", term],
    queryFn: async () => {
      let q = supabase.from("tractor_stock").select(STOCK_SEARCH_SELECT).order("created_at", { ascending: false }).limit(30);
      const t = term.trim();
      if (t) q = q.or(`chassis_number.ilike.%${t}%,engine_number.ilike.%${t}%,model.ilike.%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVehicleForChassisPrint(stockId: string | undefined) {
  return useQuery({
    queryKey: ["chassis-vehicle", stockId ?? ""],
    enabled: !!stockId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tractor_stock")
        .select(STOCK_SEARCH_SELECT)
        .eq("id", stockId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useChassisReferences(opts?: { stockId?: string; search?: string }) {
  return useQuery({
    queryKey: ["chassis-references", opts?.stockId ?? "", opts?.search ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("chassis_print_references")
        .select("*, customer:customers(id, customer_name), booking:bookings(id, booking_number), generator:profiles(id, full_name)")
        .order("generated_at", { ascending: false })
        .limit(200);
      if (opts?.stockId) q = q.eq("tractor_stock_id", opts.stockId);
      const t = (opts?.search ?? "").trim();
      if (t) q = q.or(`chassis_number.ilike.%${t}%,engine_number.ilike.%${t}%,model.ilike.%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChassisReference(id: string | undefined) {
  return useQuery({
    queryKey: ["chassis-reference", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chassis_print_references")
        .select("*, customer:customers(id, customer_name), booking:bookings(id, booking_number), generator:profiles(id, full_name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Normalises a possibly-array embedded relation from PostgREST. */
export function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}
