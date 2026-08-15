import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBooking, useCustomerDocuments, useTaxInvoice } from "@/lib/erp";
import { useVehicleDocuments } from "@/components/sales/vehicle-documents-panel";
import { signedDocUrl, type PrintSheet } from "@/lib/doc-print";
import { PASSING_SET_DOCS } from "@/lib/passing";
import { DEALER } from "@/lib/print";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/passing-set/$bookingId")({
  head: () => ({
    meta: [
      { title: "Passing document set · KrushiVidhya Automobiles" },
      { name: "description", content: "Print the full RTO passing set: invoice, Form 22, Aadhaar, PAN/Voter ID, 7-12-8A, company invoice and chassis print." },
      { property: "og:title", content: "Passing document set · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable RTO passing document set." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PassingSetPrint,
});

function PassingSetPrint() {
  const { bookingId } = Route.useParams();
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: invoice } = useTaxInvoice(bookingId);
  const { data: custDocs } = useCustomerDocuments(b?.customer_id ?? "");
  const alloc = Array.isArray(b?.allocation) ? b?.allocation[0] : (b?.allocation as { tractor_stock_id?: string; chassis_number?: string; engine_number?: string } | undefined);
  const { data: vehDocs } = useVehicleDocuments(alloc?.tractor_stock_id);

  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [sheets, setSheets] = useState<PrintSheet[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <p className="p-6 text-sm text-muted-foreground">Booking not found.</p>;

  const rows = PASSING_SET_DOCS.map((d) => {
    if (d.source === "CUSTOMER") {
      const doc = (custDocs ?? []).find((c) => c.doc_type === d.key);
      return { ...d, available: !!doc, note: doc ? `${doc.file_name ?? "File"} · ${fmtDate(doc.created_at)}` : "Not uploaded", path: doc?.file_path ?? null, bucket: "customer-documents" as const };
    }
    if (d.source === "VEHICLE") {
      const doc = (vehDocs ?? []).find((v) => v.doc_type === d.key);
      return { ...d, available: !!doc, note: doc ? `${doc.file_name ?? "File"} · ${fmtDate(doc.created_at)}` : "Not attached to this chassis", path: doc?.file_path ?? null, bucket: "vehicle-documents" as const };
    }
    return { ...d, available: true, note: d.key === "INVOICE" ? (invoice?.invoice_number ?? "Invoice not issued yet") : "Printed from vehicle details", path: null, bucket: "customer-documents" as const };
  });

  async function build() {
    setBusy(true);
    const out: PrintSheet[] = [];
    for (const r of rows) {
      if (skipped[r.key]) continue;
      const url = r.path ? await signedDocUrl(r.bucket, r.path) : null;
      out.push({ key: r.key, label: r.label, note: r.note, url });
    }
    setSheets(out);
    setBusy(false);
    setTimeout(() => window.print(), 500);
  }

  const del = Array.isArray(b.delivery) ? b.delivery[0] : b.delivery;

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="print:hidden">
        <h1 className="page-title">Passing document set</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {b.booking_number} · {b.customer?.customer_name} · {b.tractor_model}. Untick anything you do not want in this set.
        </p>
        <div className="space-y-2 rounded-lg border p-4">
          {rows.map((r) => (
            <label key={r.key} className="flex items-center gap-3 rounded-md border p-2 text-sm">
              <Checkbox checked={!skipped[r.key]} onCheckedChange={(v) => setSkipped((s) => ({ ...s, [r.key]: !v }))} />
              <span className="flex-1">
                <span className="font-medium">{r.label}</span>
                <span className="block text-xs text-muted-foreground">{r.note}</span>
              </span>
              {!r.available && <span className="text-xs font-medium text-destructive">Missing</span>}
            </label>
          ))}
          <Button className="mt-2" size="sm" disabled={busy} onClick={build}>
            <Printer className="mr-1 h-4 w-4" /> {busy ? "Preparing…" : "Prepare & print set"}
          </Button>
        </div>
      </div>

      {sheets && (
        <div className="print-area mt-6 space-y-6 print:mt-0">
          <div className="break-after-page">
            <div className="border-b pb-3 text-center">
              <h2 className="text-xl font-bold">{DEALER.name}</h2>
              <p className="text-xs text-muted-foreground">{DEALER.tagline}</p>
              <p className="text-xs text-muted-foreground">{DEALER.address}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Passing document set</p>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <Row label="Booking" value={b.booking_number} />
              <Row label="Customer" value={`${b.customer?.customer_name ?? "—"} · ${b.customer?.mobile ?? ""}`} />
              <Row label="Village" value={b.customer?.village ?? "—"} />
              <Row label="Model" value={`${b.tractor_model} ${b.variant ?? ""}`} />
              <Row label="Chassis" value={alloc?.chassis_number ?? "—"} />
              <Row label="Engine" value={alloc?.engine_number ?? "—"} />
              <Row label="Delivery date" value={fmtDate(del?.delivery_date ?? null)} />
              <Row label="Invoice" value={invoice?.invoice_number ?? "—"} />
              <Row label="Invoice value" value={invoice ? inr(invoice.grand_total) : "—"} />
            </div>
            <p className="mt-4 text-sm font-semibold">Papers in this set</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {sheets.map((s) => <li key={s.key}>{s.label}</li>)}
            </ol>
          </div>

          {sheets.map((s) => (
            <div key={s.key} className="break-after-page">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="mb-3 text-xs text-muted-foreground">{s.note}</p>
              {s.key === "FORM22" ? (
                <Form22
                  customer={b.customer?.customer_name ?? "—"}
                  village={b.customer?.village ?? "—"}
                  model={`${b.tractor_model} ${b.variant ?? ""}`}
                  chassis={alloc?.chassis_number ?? "—"}
                  engine={alloc?.engine_number ?? "—"}
                  invoiceNo={invoice?.invoice_number ?? "—"}
                  invoiceDate={fmtDate(invoice?.invoice_date ?? null)}
                />
              ) : s.url ? (
                <img src={s.url} alt={s.label} className="max-h-[950px] w-full object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Attach the physical copy of this document behind this page.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Form22(p: { customer: string; village: string; model: string; chassis: string; engine: string; invoiceNo: string; invoiceDate: string }) {
  return (
    <div className="rounded-md border p-4 text-sm">
      <p className="text-center text-base font-bold">FORM 22</p>
      <p className="mb-3 text-center text-xs text-muted-foreground">
        Initial certificate of compliance with pollution standards, safety standards of components and roadworthiness
      </p>
      <div className="space-y-1">
        <Row label="Purchaser" value={p.customer} />
        <Row label="Address" value={p.village} />
        <Row label="Make / Model" value={`Mahindra ${p.model}`} />
        <Row label="Chassis number" value={p.chassis} />
        <Row label="Engine number" value={p.engine} />
        <Row label="Invoice number" value={p.invoiceNo} />
        <Row label="Invoice date" value={p.invoiceDate} />
      </div>
      <p className="mt-4 text-xs">
        Certified that the vehicle described above complies with the provisions of the Motor Vehicles Act, 1988 and the rules made
        thereunder in respect of pollution standards, safety standards of components and roadworthiness.
      </p>
      <div className="mt-10 flex justify-end text-xs text-muted-foreground">
        <span>For {DEALER.name}</span>
      </div>
    </div>
  );
}
