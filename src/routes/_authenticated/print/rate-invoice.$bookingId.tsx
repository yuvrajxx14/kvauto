import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";


import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBooking, usePassingRecord } from "@/lib/erp";
import { fmtDate, inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/rate-invoice/$bookingId")({
  validateSearch: (s: Record<string, unknown>) => ({ kind: s.kind === "subsidy" ? "subsidy" : "passing" }),
  head: () => ({
    meta: [
      { title: "Passing / subsidy invoice · KrushiVidhya Automobiles" },
      { name: "description", content: "Print the passing or subsidy invoice with tractor serial, engine number and custom invoice rate." },
      { property: "og:title", content: "Passing / subsidy invoice · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable passing and subsidy invoice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RateInvoice,
});

function RateInvoice() {
  const { bookingId } = Route.useParams();
  const { kind } = Route.useSearch();
  const isSubsidy = kind === "subsidy";
  const field = isSubsidy ? "subsidy_invoice_rate" : "passing_invoice_rate";
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: rec } = usePassingRecord(bookingId);
  const qc = useQueryClient();
  const [rate, setRate] = useState("");

  useEffect(() => {
    const saved = (rec as Record<string, unknown> | null | undefined)?.[field];
    if (saved != null) setRate(String(saved));
    else if (b) setRate(String(b.final_price ?? ""));
  }, [rec, b, field]);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <p className="p-6 text-sm text-muted-foreground">Booking not found.</p>;

  const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
  const amount = Number(rate || 0);

  async function save() {
    if (!rec) { toast.error("Passing record not created yet"); return; }
    const { error } = await supabase.from("passing_records").update({ [field]: amount } as never).eq("id", rec.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice rate saved");
    qc.invalidateQueries();
  }

  return (
    <div>
      <div className="mx-auto flex max-w-3xl flex-wrap items-end gap-2 px-6 pt-6 print:hidden">
        <div>
          <Label>{isSubsidy ? "Subsidy" : "Passing"} invoice rate (₹)</Label>
          <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-48" />
        </div>
        <Button size="sm" variant="outline" onClick={save}>Save rate</Button>
      </div>
      <PrintShell title={isSubsidy ? "Subsidy Invoice" : "Passing Invoice"}>
        <PrintRow label="Invoice date" value={fmtDate(rec?.invoice_date ?? todayISO())} />
        <PrintRow label="Invoice number" value={rec?.invoice_number ?? "—"} />
        <PrintRow label="Customer" value={`${b.customer?.customer_name ?? "—"} · ${b.customer?.mobile ?? ""}`} />
        <PrintRow label="Village" value={b.customer?.village ?? "—"} />
        <PrintRow label="Tractor model" value={`${b.tractor_model} ${b.variant ?? ""}`} />
        <PrintRow label="Chassis / Sr. no." value={alloc?.chassis_number ?? "—"} />
        <PrintRow label="Engine no." value={alloc?.engine_number ?? "—"} />
        <div className="mt-4 flex justify-between border-t-2 pt-2 text-base font-bold">
          <span>Invoice amount</span>
          <span>{inr(amount)}</span>
        </div>
        <div className="mt-16 flex justify-between text-xs text-muted-foreground">
          <span>Customer signature</span>
          <span>Authorised signatory</span>
        </div>
      </PrintShell>
    </div>
  );
}
