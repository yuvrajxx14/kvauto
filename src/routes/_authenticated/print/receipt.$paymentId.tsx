import { createFileRoute } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { usePayment } from "@/lib/erp";
import { amountInWords } from "@/lib/print";
import { fmtDate, inr } from "@/lib/sales";
import { PAYMENT_TYPE_LABEL, type PaymentType } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/print/receipt/$paymentId")({
  head: () => ({
    meta: [
      { title: "Money receipt · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable money receipt for a tractor booking payment." },
      { property: "og:title", content: "Money receipt · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable payment receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReceiptPrint,
});

function ReceiptPrint() {
  const { paymentId } = Route.useParams();
  const { data: p, isLoading } = usePayment(paymentId);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!p) return <p className="p-6 text-sm text-muted-foreground">Receipt not found.</p>;

  const booking = p.booking;
  const customer = booking?.customer;

  return (
    <PrintShell title="Money Receipt">
      <div className="space-y-1">
        <PrintRow label="Receipt no." value={p.id.slice(0, 8).toUpperCase()} />
        <PrintRow label="Date" value={fmtDate(p.payment_date)} />
        <PrintRow label="Received from" value={customer?.customer_name ?? "—"} />
        <PrintRow label="Mobile" value={customer?.mobile ?? "—"} />
        <PrintRow label="Village" value={customer?.village ?? "—"} />
        <PrintRow label="Booking" value={booking?.booking_number ?? "—"} />
        <PrintRow label="Tractor" value={`${booking?.tractor_model ?? "—"} ${booking?.variant ?? ""}`} />
        <PrintRow label="Towards" value={PAYMENT_TYPE_LABEL[p.payment_type as PaymentType] ?? p.payment_type} />
        <PrintRow label="Mode" value={`${p.payment_mode}${p.reference_number ? ` · ${p.reference_number}` : ""}`} />
        <PrintRow label="Amount" value={inr(p.amount)} />
      </div>
      <p className="mt-3 text-sm"><span className="text-muted-foreground">In words: </span><span className="font-medium">{amountInWords(Number(p.amount))}</span></p>
      {p.remarks && <p className="mt-2 text-sm text-muted-foreground">Remarks: {p.remarks}</p>}

      <div className="mt-10 flex justify-between text-xs text-muted-foreground">
        <span>Customer signature</span>
        <span>For KrushiVidhya Automobiles</span>
      </div>
    </PrintShell>
  );
}
