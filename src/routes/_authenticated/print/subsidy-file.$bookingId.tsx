import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBooking, useBookingPayments, useCustomerDocuments, usePassingRecord, useTaxInvoice } from "@/lib/erp";
import { signedDocUrl, type PrintSheet } from "@/lib/doc-print";
import { SUBSIDY_FILE_DOCS } from "@/lib/passing";
import { DEALER } from "@/lib/print";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/subsidy-file/$bookingId")({
  head: () => ({
    meta: [
      { title: "Subsidy file · KrushiVidhya Automobiles" },
      { name: "description", content: "Print the government subsidy file: cover checklist, dealer invoice, money receipt and supporting documents." },
      { property: "og:title", content: "Subsidy file · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable subsidy file with cover checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubsidyFilePrint,
});

function SubsidyFilePrint() {
  const { bookingId } = Route.useParams();
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: invoice } = useTaxInvoice(bookingId);
  const { data: rec } = usePassingRecord(bookingId);
  const { data: payments } = useBookingPayments(bookingId);
  const { data: custDocs } = useCustomerDocuments(b?.customer_id ?? "");

  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [sheets, setSheets] = useState<PrintSheet[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <p className="p-6 text-sm text-muted-foreground">Booking not found.</p>;

  const rows = SUBSIDY_FILE_DOCS.map((d) => {
    const docType = (d as { docType?: string }).docType;
    const doc = docType
      ? (custDocs ?? []).find((c) => c.doc_type === docType && c.verification_status === "RECEIVED")
      : undefined;
    return {
      key: d.key,
      label: d.label,
      source: d.source,
      path: null as string | null,
      note: doc
        ? `Collected in customer file · ${fmtDate(doc.created_at)}`
        : d.source === "GENERATED"
          ? "Printed from the system"
          : d.source === "CUSTOMER"
            ? "Not collected — attach the customer copy"
            : "Attach the physical copy",
      available: d.source === "GENERATED" || !!doc,
    };
  });

  async function build() {
    setBusy(true);
    const out: PrintSheet[] = [];
    for (const r of rows) {
      if (skipped[r.key]) continue;
      out.push({ key: r.key, label: r.label, note: r.note, url: await signedDocUrl("customer-documents", r.path) });
    }
    setSheets(out);
    setBusy(false);
    setTimeout(() => window.print(), 500);
  }

  const received = Number(b.amount_received ?? 0);

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="print:hidden">
        <h1 className="page-title">Subsidy file</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {b.booking_number} · {b.customer?.customer_name} · {b.tractor_model}
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
            <Printer className="mr-1 h-4 w-4" /> {busy ? "Preparing…" : "Prepare & print file"}
          </Button>
        </div>
      </div>

      {sheets && (
        <div className="print-area mt-6 space-y-6 print:mt-0">
          <div className="break-after-page">
            <div className="border-b pb-3 text-center">
              <h2 className="text-xl font-bold">{DEALER.name}</h2>
              <p className="text-xs text-muted-foreground">{DEALER.tagline}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Subsidy file cover checklist</p>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <Row label="Customer" value={`${b.customer?.customer_name ?? "—"} · ${b.customer?.mobile ?? ""}`} />
              <Row label="Village" value={b.customer?.village ?? "—"} />
              <Row label="Model" value={`${b.tractor_model} ${b.variant ?? ""}`} />
              <Row label="Invoice" value={`${invoice?.invoice_number ?? "—"} · ${fmtDate(invoice?.invoice_date ?? null)}`} />
              <Row label="RTO number" value={rec?.rto_number ?? "—"} />
              <Row label="File date" value={fmtDate(rec?.subsidy_file_date ?? null)} />
            </div>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-1 text-left">#</th>
                  <th className="border p-1 text-left">Document</th>
                  <th className="border p-1 text-left">Enclosed</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((s, i) => (
                  <tr key={s.key}>
                    <td className="border p-1">{i + 1}</td>
                    <td className="border p-1">{s.label}</td>
                    <td className="border p-1">☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sheets.map((s) => (
            <div key={s.key} className="break-after-page">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="mb-3 text-xs text-muted-foreground">{s.note}</p>
              {s.key === "money_receipt" ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-1 text-left">Date</th>
                      <th className="border p-1 text-left">Mode</th>
                      <th className="border p-1 text-left">Reference</th>
                      <th className="border p-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments ?? []).map((p) => (
                      <tr key={p.id}>
                        <td className="border p-1">{fmtDate(p.payment_date)}</td>
                        <td className="border p-1">{p.payment_mode}</td>
                        <td className="border p-1">{p.reference_number ?? "—"}</td>
                        <td className="border p-1 text-right">{inr(p.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border p-1 font-semibold" colSpan={3}>Total received</td>
                      <td className="border p-1 text-right font-semibold">{inr(received)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : s.key === "dealer_invoice" ? (
                <div className="space-y-1 text-sm">
                  <Row label="Invoice number" value={invoice?.invoice_number ?? "—"} />
                  <Row label="Invoice date" value={fmtDate(invoice?.invoice_date ?? null)} />
                  <Row label="Taxable value" value={invoice ? inr(invoice.taxable_value) : "—"} />
                  <Row label="Grand total" value={invoice ? inr(invoice.grand_total) : "—"} />
                  <p className="pt-2 text-xs text-muted-foreground">Attach the printed tax invoice copy behind this page.</p>
                </div>
              ) : s.url ? (
                <img src={s.url} alt={s.label} className="max-h-[950px] w-full object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">Attach the physical copy of this document behind this page.</p>
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
