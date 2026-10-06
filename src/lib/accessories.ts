import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: unknown) => any };

export type Accessory = { id: string; name: string; qty_on_hand: number; reorder_level: number; rate: number; sort_order: number; active: boolean };
export type AccountInvoice = {
  id: string; invoice_type: "PURCHASE" | "SALE"; invoice_number: string; invoice_date: string;
  party_name: string; party_gstin: string | null; total_amount: number; remarks: string | null;
  items?: { id: string; description: string; qty: number; rate: number; amount: number; item_kind: string }[];
};

export const isReorder = (a: Accessory) => Number(a.qty_on_hand) <= Number(a.reorder_level);

export function useAccessories() {
  return useQuery({
    queryKey: ["accessories"],
    queryFn: async (): Promise<Accessory[]> => {
      const { data, error } = await db.from("accessories").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeliveryAccessories(bookingId: string) {
  return useQuery({
    queryKey: ["delivery-accessories", bookingId],
    queryFn: async (): Promise<{ accessory_id: string; given: boolean }[]> => {
      const { data, error } = await db.from("delivery_accessories").select("accessory_id, given").eq("booking_id", bookingId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAccountInvoices() {
  return useQuery({
    queryKey: ["account-invoices"],
    queryFn: async (): Promise<AccountInvoice[]> => {
      const { data, error } = await db
        .from("account_invoices")
        .select("*, items:account_invoice_items(id, description, qty, rate, amount, item_kind)")
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
