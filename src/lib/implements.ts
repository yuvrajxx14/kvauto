import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const IMPLEMENT_STOCK_STATUSES = ["AVAILABLE", "RESERVED", "SOLD"] as const;
export type ImplementStockStatus = (typeof IMPLEMENT_STOCK_STATUSES)[number];

export const IMPLEMENT_STOCK_STATUS_LABEL: Record<ImplementStockStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
};

export const IMPLEMENT_SALE_STATUSES = ["OPEN", "PAID", "CANCELLED"] as const;
export type ImplementSaleStatus = (typeof IMPLEMENT_SALE_STATUSES)[number];

export const IMPLEMENT_SALE_STATUS_LABEL: Record<ImplementSaleStatus, string> = {
  OPEN: "Balance pending",
  PAID: "Fully paid",
  CANCELLED: "Cancelled",
};

export const IMPLEMENT_CATEGORIES = [
  "Tillage",
  "Haulage",
  "Sowing",
  "Harvesting",
  "Spraying",
  "Other",
] as const;

export const IMPLEMENT_LOCATIONS = ["Main Showroom", "Yard", "Workshop"] as const;

export type ImplementProduct = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  size_spec: string | null;
  suitable_hp: string | null;
  default_price: number;
  sort_order: number;
  active: boolean;
};

export function useImplementProducts(activeOnly = false) {
  return useQuery({
    queryKey: ["implement-products", activeOnly],
    queryFn: async (): Promise<ImplementProduct[]> => {
      let q = supabase
        .from("implement_products")
        .select("id, name, category, brand, size_spec, suitable_hp, default_price, sort_order, active");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as ImplementProduct[]).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
      );
    },
    staleTime: 60_000,
  });
}

export function useImplementStock(status?: string) {
  return useQuery({
    queryKey: ["implement-stock", status ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("implement_stock")
        .select("*, product:implement_products(id, name, category)")
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImplementSales() {
  return useQuery({
    queryKey: ["implement-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("implement_sales")
        .select(
          "*, customer:customers(id, customer_name, mobile, village), booking:bookings(id, booking_number, tractor_model), items:implement_sale_items(*)",
        )
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImplementSale(saleId: string) {
  return useQuery({
    queryKey: ["implement-sale", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("implement_sales")
        .select(
          "*, customer:customers(id, customer_name, mobile, village), booking:bookings(id, booking_number, tractor_model), items:implement_sale_items(*)",
        )
        .eq("id", saleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!saleId,
  });
}

export function useImplementPayments(saleId: string) {
  return useQuery({
    queryKey: ["implement-payments", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("implement_payments")
        .select("*")
        .eq("sale_id", saleId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!saleId,
  });
}

/** Implements sold against a specific tractor booking. */
export function useBookingImplements(bookingId: string) {
  return useQuery({
    queryKey: ["booking-implements", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("implement_sales")
        .select("*, items:implement_sale_items(*)")
        .eq("booking_id", bookingId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!bookingId,
  });
}

export type CustomerLite = {
  id: string;
  customer_name: string;
  mobile: string;
  village: string | null;
};

export function useCustomerOptions() {
  return useQuery({
    queryKey: ["customer-options"],
    queryFn: async (): Promise<CustomerLite[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name, mobile, village")
        .order("customer_name");
      if (error) throw error;
      return (data ?? []) as CustomerLite[];
    },
    staleTime: 60_000,
  });
}
