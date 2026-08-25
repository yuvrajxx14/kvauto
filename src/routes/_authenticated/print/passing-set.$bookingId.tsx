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
      const doc = (custDocs ?? []).find((c) => c.doc_type === d.key && c.verification_status === "RECEIVED");
      return { ...d, available: !!doc, note: doc ? `Collected in customer file · ${fmtDate(doc.created_at)}` : "Not collected — attach the physical copy", path: null, bucket: "vehicle-documents" as const };
    }
    if (d.source === "VEHICLE") {
      const doc = (vehDocs ?? []).find((v) => v.doc_type === d.key);
      return { ...d, available: !!doc, note: doc ? `${doc.file_name ?? "File"} · ${fmtDate(doc.created_at)}` : "Not attached to this chassis", path: doc?.file_path ?? null, bucket: "vehicle-documents" as const };
    }
    return { ...d, available: true, note: d.key === "INVOICE" ? (invoice?.invoice_number ?? "Invoice not issued yet") : "Printed from vehicle details", path: null, bucket: "vehicle-documents" as const };
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
                <Form22 />
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

/** Form 22 replica of the Mahindra & Mahindra Ltd. (Tractor Division) certificate.
 *  Vehicle-specific fields (chassis / engine) are left blank to be filled by hand. */
function Form22() {
  const cell = "border border-black px-2 py-1 align-middle";
  return (
    <div className="mx-auto max-w-[780px] text-[11px] leading-snug text-black">
      <div className="text-center">
        <p className="text-[19px] font-bold tracking-wide">MAHINDRA &amp; MAHINDRA LTD.</p>
        <p className="mt-1 text-[12px] font-bold tracking-wide">TRACTOR DIVISION</p>
        <p className="mt-1">Mahindra &amp; Mahindra Ltd. (Farm Equipment Sector)</p>
        <p>C/o. Deepak Diesel Pvt. Ltd., Survey no. 287/1, Shapar Village Main Road,</p>
        <p>Shapar (veraval), Dist: Rajkot - 360 024</p>
        <p className="mt-4 text-[15px] font-bold tracking-[0.35em] underline">FORM-22</p>
        <p className="mt-2">[See rules 47 (1) (g), 115, 124 (2) and 127]</p>
        <p className="mt-2 text-[12px] font-bold underline">
          INITIAL CERTIFICATE OF COMPLAINCE WITH POLLUTION STANDARDS SAFETY
        </p>
        <p className="text-[12px] font-bold underline">STANDARS OF COMPNENTS AND ROAD WORTHINESS</p>
      </div>

      <p className="mt-4">
        It is certified that the following vehicle complies with the emission values, including mass emission norms and noise
        standards including noise level under the provisions of the Motor Vehicles Act, 1988, and the rules made thereunder as
        specified below:
      </p>

      <ol className="mt-3 list-decimal space-y-1 pl-6">
        <li>Brand Name of the vehicle: <span className="font-bold">MAHINDRA &amp; MAHINDRA LTD.</span></li>
        <li>Chassis number: <span className="inline-block min-w-[220px] border-b border-dotted border-black">&nbsp;</span></li>
        <li>Engine number: <span className="inline-block min-w-[220px] border-b border-dotted border-black">&nbsp;</span></li>
        <li>Emission norms applicable: <span className="font-bold">BHARAT (TREM) STAGE III A</span></li>
        <li>
          The emission sound level noise values of the above vehicle model, obtained during Type Approval as per Canteral Motor
          Vehicle Rules, 1989 are given below: -
          <p className="mt-1 font-bold underline">(i) Emission values [refer rule 115 A (7)]:</p>
          <p className="font-bold underline">a) For Diesel Vehicles (Agricultural Tractors)</p>
        </li>
      </ol>

      <table className="mt-3 w-full border-collapse border border-black text-center">
        <thead>
          <tr>
            <th className={`${cell} w-[9%]`} rowSpan={2}>Sr. No.</th>
            <th className={`${cell} w-[31%]`} rowSpan={2}>Pollutant</th>
            <th className={cell} colSpan={3}>Mass in gm/kWh</th>
          </tr>
          <tr>
            <th className={cell}>8&lt;=kW&lt;19</th>
            <th className={cell}>19&lt;=kW&lt;37</th>
            <th className={cell}>37&lt;=kW&lt;56</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["1", "Carbon Monoxide", "5.5", "5.5", "5.0"],
            ["2", "Hydro Carbon", "NA", "NA", "NA"],
            ["3", "Non-Methane HC", "NA", "NA", "NA"],
            ["4", "NOx, (if applicable)", "NA", "NA", "NA"],
            ["5", "HC + NOx (if applicable) - Maximum", "8.5", "7.5", "4.7"],
            ["6", "PM", "0.8", "0.6", "0.4"],
          ].map((row) => (
            <tr key={row[0]}>
              <td className={cell}>{row[0]}</td>
              <td className={`${cell} text-left`}>{row[1]}</td>
              <td className={cell}>{row[2]}</td>
              <td className={cell}>{row[3]}</td>
              <td className={cell}>{row[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 font-bold underline">(ii) Noise Level [rule 119 and 120 (3)]:</p>
      <div className="mt-3 space-y-1">
        <p>a) Horn (For all vehicles other than agricultural tractors &amp; construction equipment vehicles) <span className="ml-6 font-bold">NA</span></p>
        <p>b) By stander&apos;s position ((For all vehicles other than agricultural tractors &amp; construction equipment vehicles) <span className="ml-2 font-bold">NA</span></p>
        <p className="font-bold">c) Operator&apos;s ear level (for agricultural tractors &amp; construction equipment vehicles):</p>
      </div>
      <div className="mt-3 space-y-1">
        <p>96dB(A) Maximum - as per Annexure I of AIS 115 Part 1 - 2009</p>
        <p>Or</p>
        <p>92dB(A) Maximum - as per Annexure II of AIS 115 Part 1 - 2009</p>
      </div>

      <div className="mt-16 text-right">
        <p className="font-bold">MAHINDRA &amp; MAHINDRA LTD.</p>
        <div className="h-16" />
        <p className="font-bold">AUTHORISED SIGNATORY</p>
        <p>(TRACTOR DIVISION)</p>
      </div>
    </div>
  );
}
