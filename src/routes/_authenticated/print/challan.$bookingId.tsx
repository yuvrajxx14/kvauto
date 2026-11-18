import { createFileRoute } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { useBooking, useGatePass } from "@/lib/erp";
import { useDeliveryAccessories } from "@/lib/accessories";
import { useAccessories } from "@/lib/accessories";
import { fmtDate } from "@/lib/sales";

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
  const { data: accessoryRows } = useDeliveryAccessories(bookingId);
  const { data: accessories } = useAccessories();

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
  const given = new Set((accessoryRows ?? []).filter((row) => row.given).map((row) => row.accessory_id));
  const district = b.customer?.district || "—";
  const tehsil = b.customer?.taluka || "—";
  const hypo = b.hypothecation || (b.finance_type === "LOAN" ? b.finance_company : null) || "—";

  return (
    <PrintShell title="Delivery Challan">
      <div className="space-y-1">
        <PrintRow label="Challan no." value={b.booking_number} />
        <PrintRow label="Date" value={fmtDate(delivery?.delivery_date ?? gp.issue_date)} />
        <PrintRow label="Customer" value={b.customer?.customer_name ?? "—"} />
        <PrintRow label="Village" value={b.customer?.village ?? "—"} />
        <PrintRow label="Tehsil" value={tehsil} />
        <PrintRow label="District" value={district} />
        <PrintRow label="HPA / Hypothecation" value={hypo} />
        <PrintRow label="Model" value={`${b.tractor_model} ${b.variant ?? ""}`} />
        <PrintRow label="Chassis number" value={alloc?.chassis_number ?? "—"} />
        <PrintRow label="Engine number" value={alloc?.engine_number ?? "—"} />
      </div>

      <p className="mt-4 text-sm leading-relaxed">
        We have checked in good condition our Mahindra {b.tractor_model} DI tractor having chassis number {alloc?.chassis_number ?? "__________"} and engine number {alloc?.engine_number ?? "__________"}, which has been fully inspected and trialled by us. Today we have received the tractor mentioned above with the following items, and confirm that the company’s rear-side instructions and warranty system have been explained and understood. Remarks by us:
      </p>
      <div className="mt-3 min-h-16 border-b border-dashed" />

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold">Accessories handed over</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {(accessories ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center border border-foreground">{given.has(item.id) ? "✓" : ""}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-12 text-xs">
        <div className="border-t border-foreground pt-2">Customer signature</div>
        <div className="border-t border-foreground pt-2">Dealer signature</div>
      </div>

      <section className="mt-8 break-before-page border-t pt-8 print:border-0 print:pt-0">
        <h2 className="text-center text-lg font-semibold">Mahindra Tractor Warranty Information</h2>
        <p className="mt-4 text-sm text-muted-foreground">Model-specific warranty details will be added when the warranty information photo is provided.</p>
      </section>
    </PrintShell>
  );
}
