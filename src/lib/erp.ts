import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DemandRow, StockStatus } from "@/lib/stock";
import type { BookingStatus } from "@/lib/booking";

export const BOOKING_SELECT = `
  *,
  customer:customers(id, customer_name, mobile, village),
  inquiry:inquiries(id, inquiry_number),
  salesman:profiles!bookings_salesman_id_fkey(id, full_name),
  allocation:tractor_allocations(*, stock:tractor_stock(*)),
  delivery:deliveries(*)
`;

export function useBookings(search?: string) {
  return useQuery({
    queryKey: ["bookings", search ?? ""],
    queryFn: async () => {
      let q = supabase.from("bookings").select(BOOKING_SELECT).order("booking_date", { ascending: false });
      const term = (search ?? "").trim();
      if (term) q = q.or(`booking_number.ilike.%${term}%,tractor_model.ilike.%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!bookingId,
  });
}

export function useStock(opts?: { status?: string | undefined; model?: string | undefined }) {
  return useQuery({
    queryKey: ["stock", opts?.status ?? "all", opts?.model ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tractor_stock").select("*").order("created_at", { ascending: false });
      if (opts?.status && opts.status !== "all") q = q.eq("status", opts.status);
      if (opts?.model && opts.model !== "all") q = q.eq("model", opts.model);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStockItem(id: string) {
  return useQuery({
    queryKey: ["stock-item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tractor_stock").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useTractorOrders() {
  return useQuery({
    queryKey: ["tractor-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tractor_orders")
        .select("*")
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModelConfig() {
  return useQuery({
    queryKey: ["model-stock-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("model_stock_config").select("*").order("model");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Model-wise demand vs stock, computed from stock, bookings and orders. */
export function useDemandVsStock() {
  const stock = useStock();
  const bookings = useBookings();
  const orders = useTractorOrders();
  const config = useModelConfig();

  const isLoading = stock.isLoading || bookings.isLoading || orders.isLoading || config.isLoading;
  const rows: DemandRow[] = [];

  if (!isLoading) {
    const models = new Set<string>();
    (stock.data ?? []).forEach((s) => models.add(s.model));
    (bookings.data ?? []).forEach((b) => models.add(b.tractor_model));
    (orders.data ?? []).forEach((o) => models.add(o.model));
    (config.data ?? []).forEach((c) => models.add(c.model));

    for (const model of Array.from(models).sort()) {
      const units = (stock.data ?? []).filter((s) => s.model === model);
      const count = (st: StockStatus) => units.filter((u) => u.status === st).length;
      const available = count("AVAILABLE");
      const reserved = count("RESERVED");
      const allocated = count("ALLOCATED");
      const incomingStock = units.filter((u) => u.status === "ORDERED" || u.status === "IN_TRANSIT").length;
      const incomingOrders = (orders.data ?? [])
        .filter((o) => o.model === model && ["APPROVED", "ORDERED", "IN_TRANSIT"].includes(o.status))
        .reduce((sum, o) => sum + (o.quantity ?? 0), 0);
      const incoming = incomingStock + incomingOrders;

      const openBookings = (bookings.data ?? []).filter(
        (b) => b.tractor_model === model && !["DELIVERED", "CANCELLED"].includes(b.status),
      );
      const bookedDemand = openBookings.length;
      const pendingDemand = openBookings.filter((b) =>
        ["BOOKED", "AWAITING_STOCK", "STOCK_AVAILABLE"].includes(b.status as BookingStatus),
      ).length;

      const minRegular = (config.data ?? []).find((c) => c.model === model)?.min_regular_stock ?? 0;
      const requiredForBookings = Math.max(0, pendingDemand - available - incoming);
      const freeAfterBookings = Math.max(0, available + incoming - pendingDemand);
      const requiredForRegular = Math.max(0, minRegular - freeAfterBookings);

      rows.push({
        model,
        available,
        reserved,
        allocated,
        incoming,
        bookedDemand,
        pendingDemand,
        minRegular,
        requiredForBookings,
        requiredForRegular,
        suggestedOrder: requiredForBookings + requiredForRegular,
        orderRequired: requiredForBookings > 0,
        belowMinimum: minRegular > 0 && available < minRegular,
      });
    }
  }

  return { rows, isLoading, stock: stock.data ?? [], bookings: bookings.data ?? [] };
}

export function useDocumentChecklist() {
  return useQuery({
    queryKey: ["document-checklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_checklist")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export function useCustomerDocuments(customerId: string) {
  return useQuery({
    queryKey: ["customer-documents", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_documents")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customerId,
  });
}

export function useLedger(customerId: string) {
  return useQuery({
    queryKey: ["ledger", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_entries")
        .select("*, booking:bookings(id, booking_number)")
        .eq("customer_id", customerId)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customerId,
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*, booking:bookings(id, booking_number, customer_id, customer:customers(id, customer_name, mobile))")
        .order("payment_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function ledgerTotals(entries: { direction: string; amount: number }[]) {
  const debit = entries.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + Number(e.amount), 0);
  const credit = entries.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + Number(e.amount), 0);
  return { debit, credit, outstanding: debit - credit };
}

/* ---------- Product master ---------- */

export type Product = {
  id: string;
  model: string;
  hp: string | null;
  category: string | null;
  sort_order: number;
  active: boolean;
};

export function useProducts(activeOnly = false) {
  return useQuery({
    queryKey: ["products", activeOnly],
    queryFn: async (): Promise<Product[]> => {
      let q = supabase.from("products").select("id, model, hp, category, sort_order, active");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as Product[]).sort((a, b) =>
        a.model.localeCompare(b.model, undefined, { numeric: true, sensitivity: "base" }),
      );
    },
    staleTime: 60_000,
  });
}

/* ---------- Subsidy ---------- */

export function useSubsidyCases() {
  return useQuery({
    queryKey: ["subsidy-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subsidy_cases")
        .select("*, customer:customers(id, customer_name, mobile, village), booking:bookings(id, booking_number, tractor_model, final_price, extra_charges, amount_received)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubsidyCase(bookingId: string) {
  return useQuery({
    queryKey: ["subsidy-case", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subsidy_cases").select("*").eq("booking_id", bookingId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}

/* ---------- Passing ---------- */

export function usePassingRecord(bookingId: string) {
  return useQuery({
    queryKey: ["passing", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passing_records")
        .select("*, checklist:passing_checklist(*)")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}

export function usePassingRecords() {
  return useQuery({
    queryKey: ["passing-records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("passing_records").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*, booking:bookings(*, customer:customers(*))")
        .eq("id", paymentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!paymentId,
  });
}

/* ---------- Tax invoice (RTO) ---------- */

export function useTaxInvoice(bookingId: string) {
  return useQuery({
    queryKey: ["tax-invoice", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_invoices")
        .select("*, booking:bookings(*, customer:customers(*))")
        .eq("booking_id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });
}

/** Total due on a booking: deal price + extra charges (loan doc charge, insurance). */
export function bookingDue(b: { final_price: number | null; extra_charges?: number | null }) {
  return Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0);
}

