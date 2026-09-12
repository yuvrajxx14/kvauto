import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SparePart = {
  id: string;
  part_number: string;
  part_name: string;
  category: string | null;
  brand: string | null;
  rack_location: string | null;
  purchase_rate: number;
  sale_rate: number;
  qty_on_hand: number;
  min_qty: number;
  unit: string;
  remarks: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SpareMovement = {
  id: string;
  part_id: string;
  movement_type: string;
  qty: number;
  rate: number;
  reference: string | null;
  remarks: string | null;
  created_at: string;
};

export const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Stock received",
  OUT: "Stock issued",
  ADJUST: "Stock corrected",
  OPENING: "Opening / uploaded stock",
};

export function useSpareParts(opts?: { search?: string; category?: string; stock?: string }) {
  return useQuery({
    queryKey: ["spare-parts", opts?.search ?? "", opts?.category ?? "all", opts?.stock ?? "all"],
    queryFn: async () => {
      let q = supabase.from("spare_parts").select("*").order("part_name");
      const term = (opts?.search ?? "").trim();
      if (term) q = q.or(`part_name.ilike.%${term}%,part_number.ilike.%${term}%,rack_location.ilike.%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SparePart[];
    },
  });
}

export function useSpareMovements(partId: string) {
  return useQuery({
    queryKey: ["spare-movements", partId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_stock_movements")
        .select("*")
        .eq("part_id", partId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SpareMovement[];
    },
    enabled: !!partId,
  });
}

export function stockValue(parts: SparePart[]) {
  return parts.reduce((s, p) => s + Number(p.qty_on_hand) * Number(p.purchase_rate || p.sale_rate || 0), 0);
}

export function isLow(p: SparePart) {
  return Number(p.qty_on_hand) <= Number(p.min_qty);
}

/** Columns accepted by the current-stock upload sheet. */
export const SPARE_UPLOAD_COLUMNS = [
  { key: "part_number", label: "Part number", required: true, sample: "007000180D91" },
  { key: "part_name", label: "Part name", required: true, sample: "Oil Filter" },
  { key: "qty", label: "Current stock qty", required: true, sample: "12" },
  { key: "category", label: "Category", sample: "Filters" },
  { key: "brand", label: "Brand", sample: "Mahindra Genuine" },
  { key: "rack_location", label: "Rack / location", sample: "A-12" },
  { key: "purchase_rate", label: "Purchase rate", sample: "210" },
  { key: "sale_rate", label: "Selling rate", sample: "265" },
  { key: "min_qty", label: "Minimum stock", sample: "5" },
] as const;
