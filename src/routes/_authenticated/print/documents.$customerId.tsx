import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCustomerDocuments, useDocumentChecklist } from "@/lib/erp";
import { DEALER } from "@/lib/print";
import { fmtDate } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/documents/$customerId")({
  head: () => ({
    meta: [
      { title: "Document collection checklist · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable checklist of the physical documents to be collected from the customer." },
      { property: "og:title", content: "Document collection checklist · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable customer document collection checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPrint,
});

function DocumentsPrint() {
  const { customerId } = Route.useParams();
  const { data: checklist } = useDocumentChecklist();
  const { data: docs } = useCustomerDocuments(customerId);

  const { data: customer } = useQuery({
    queryKey: ["customer-basic", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("customer_name, mobile, village")
        .eq("id", customerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rows = (checklist ?? []).map((c) => {
    const doc = (docs ?? []).find((d) => d.doc_type === c.doc_type && d.verification_status === "RECEIVED");
    return {
      key: c.id,
      label: c.label,
      required: c.is_required,
      number: doc?.document_number ?? null,
      collected: !!doc,
      collectedOn: doc ? fmtDate(doc.created_at) : null,
    };
  });
  const pending = rows.filter((r) => r.required && !r.collected);

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="print:hidden mb-4 flex items-center justify-between">
        <div>
          <h1 className="page-title">Document collection checklist</h1>
          <p className="text-sm text-muted-foreground">
            {customer?.customer_name ?? "—"} · {customer?.mobile ?? "—"} · {pending.length} pending
          </p>
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </div>

      <div className="print-area rounded-lg border p-6 print:rounded-none print:border-0 print:p-0">
        <div className="border-b pb-3 text-center">
          <h2 className="text-xl font-bold">{DEALER.name}</h2>
          <p className="text-xs text-muted-foreground">{DEALER.tagline}</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Customer document collection checklist</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-muted-foreground">Customer:</span> {customer?.customer_name ?? "—"}</p>
          <p><span className="text-muted-foreground">Mobile:</span> {customer?.mobile ?? "—"}</p>
          <p><span className="text-muted-foreground">Village:</span> {customer?.village ?? "—"}</p>
          <p><span className="text-muted-foreground">Printed on:</span> {fmtDate(new Date().toISOString())}</p>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y bg-muted/40 text-left">
              <th className="p-2 w-10">#</th>
              <th className="p-2">Document</th>
              <th className="p-2">Number</th>
              <th className="p-2">Collected on</th>
              <th className="p-2 w-24 text-center">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-b align-top">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">
                  {r.label}
                  {r.required && <span className="text-destructive"> *</span>}
                </td>
                <td className="p-2">{r.number ?? "—"}</td>
                <td className="p-2">{r.collectedOn ?? "—"}</td>
                <td className="p-2 text-center">{r.collected ? "✔" : "☐"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-xs text-muted-foreground">
          * Mandatory documents. All documents are collected physically and kept in the customer file.
        </p>

        <div className="mt-10 flex justify-between text-xs">
          <div>
            <div className="h-10 w-40 border-b border-dotted" />
            <p className="mt-1">Customer signature</p>
          </div>
          <div>
            <div className="h-10 w-40 border-b border-dotted" />
            <p className="mt-1">Received by (dealership)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
