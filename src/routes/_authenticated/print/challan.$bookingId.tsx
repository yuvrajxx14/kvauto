import { createFileRoute } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { useBooking, useGatePass } from "@/lib/erp";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/challan/$bookingId")({
  head: () => ({
    meta: [
      { title: "Delivery challan · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable tractor delivery challan with chassis, engine and payment summary." },
      { property: "og:title", content: "Delivery challan · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable tractor delivery challan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChallanPrint,
});

function ChallanPrint() {
  const { bookingId } = Route.useParams();
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: gp, isLoading: gpLoading } = useGatePass(bookingId);

  if (isLoading || gpLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <p className="p-6 text-sm text-muted-foreground">Booking not found.</p>;
  if (!gp)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Delivery challan is prepared from the gate pass. Issue the gate pass first (allowed only after full payment is
        received) from the delivery page.
      </p>
    );

  const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
  const delivery = Array.isArray(b.delivery) ? b.delivery[0] : b.delivery;
  const due = Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0);

  return (
    <PrintShell title="Delivery Challan">
      <div className="space-y-1">
        <PrintRow label="Challan no." value={b.booking_number} />
        <PrintRow label="Gate pass no." value={`${gp.gatepass_number} · ${fmtDate(gp.issue_date)}`} />
        <PrintRow label="Delivery date" value={fmtDate(delivery?.delivery_date ?? null)} />
        <PrintRow label="Customer" value={b.customer?.customer_name ?? "—"} />
        <PrintRow label="Mobile" value={b.customer?.mobile ?? "—"} />
        <PrintRow label="Village" value={b.customer?.village ?? "—"} />
        <PrintRow label="Model" value={`${b.tractor_model} ${b.variant ?? ""}`} />
        <PrintRow label="Chassis number" value={alloc?.chassis_number ?? "—"} />
        <PrintRow label="Engine number" value={alloc?.engine_number ?? "—"} />
        <PrintRow label="Use type" value={delivery?.use_type ?? "—"} />
        <PrintRow label="Deal price" value={inr(b.final_price)} />
        <PrintRow label="Other charges" value={inr(b.extra_charges)} />
        <PrintRow label="Total" value={inr(due)} />
        <PrintRow label="Received" value={inr(b.amount_received)} />
        <PrintRow label="Balance" value={inr(Math.max(0, due - Number(b.amount_received ?? 0)))} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        The tractor described above has been received in good condition along with the tools, documents and accessories.
      </p>

      <div className="mt-10 flex justify-between text-xs text-muted-foreground">
        <span>Customer signature</span>
        <span>For KrushiVidhya Automobiles</span>
      </div>
    </PrintShell>
  );
}
