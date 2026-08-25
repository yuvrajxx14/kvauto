import { createFileRoute } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { useBooking, useGatePass } from "@/lib/erp";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/gatepass/$bookingId")({
  head: () => ({
    meta: [
      { title: "Gate pass · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable tractor gate pass issued after full payment is received." },
      { property: "og:title", content: "Gate pass · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable tractor gate pass." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GatePassPrint,
});

function GatePassPrint() {
  const { bookingId } = Route.useParams();
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: gp, isLoading: gpLoading } = useGatePass(bookingId);

  if (isLoading || gpLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <p className="p-6 text-sm text-muted-foreground">Booking not found.</p>;
  if (!gp)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No gate pass issued for this booking yet. Issue the gate pass from the delivery page after full payment.
      </p>
    );

  return (
    <PrintShell title="Gate Pass">
      <div className="space-y-1">
        <PrintRow label="Gate pass no." value={gp.gatepass_number} />
        <PrintRow label="Date" value={fmtDate(gp.issue_date)} />
        <PrintRow label="Booking no." value={b.booking_number} />
        <PrintRow label="Customer" value={b.customer?.customer_name ?? "—"} />
        <PrintRow label="Mobile" value={b.customer?.mobile ?? "—"} />
        <PrintRow label="Village" value={b.customer?.village ?? "—"} />
        <PrintRow label="Model" value={`${gp.model ?? b.tractor_model} ${gp.variant ?? ""}`} />
        <PrintRow label="Chassis number" value={gp.chassis_number ?? "—"} />
        <PrintRow label="Engine number" value={gp.engine_number ?? "—"} />
        <PrintRow label="Total payable" value={inr(Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0))} />
        <PrintRow label="Amount received" value={inr(b.amount_received)} />
        <PrintRow label="Payment status" value="Full payment received" />
        <PrintRow label="Remarks" value={gp.remarks || "—"} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Full payment for the above tractor has been received. Security is permitted to allow the vehicle out of the premises
        against this gate pass. Delivery challan is to be prepared on the basis of this gate pass.
      </p>

      <div className="mt-10 flex justify-between text-xs text-muted-foreground">
        <span>Security signature</span>
        <span>Accounts / Authorised signatory</span>
      </div>
    </PrintShell>
  );
}
