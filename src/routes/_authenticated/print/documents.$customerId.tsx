import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCustomerDocuments, useDocumentChecklist } from "@/lib/erp";
import { DEALER } from "@/lib/print";
import { fmtDate } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/documents/$customerId")({
  head: () => ({
    meta: [
      { title: "Print documents · KrushiVidhya Automobiles" },
      { name: "description", content: "Select and print the customer documents required for passing and subsidy." },
      { property: "og:title", content: "Print documents · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Select and print customer documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPrint,
});

type Sheet = { docType: string; label: string; number: string | null; fileName: string | null; status: string; url: string | null; created: string };

function DocumentsPrint() {
  const { customerId } = Route.useParams();
  const { data: checklist } = useDocumentChecklist();
  const { data: docs } = useCustomerDocuments(customerId);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState<Sheet[] | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["customer-basic", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("customer_name, mobile, village").eq("id", customerId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rows = (docs ?? []).map((d) => ({
    id: d.id,
    docType: d.doc_type,
    label: (checklist ?? []).find((c) => c.doc_type === d.doc_type)?.label ?? d.doc_type,
    number: d.document_number,
    fileName: d.file_name,
    filePath: d.file_path,
    status: d.verification_status,
    created: d.created_at,
  }));

  async function build() {
    setBusy(true);
    const chosen = rows.filter((r) => selected[r.id]);
    const sheets: Sheet[] = [];
    for (const r of chosen) {
      let url: string | null = null;
      if (r.filePath) {
        const { data } = await supabase.storage.from("customer-documents").createSignedUrl(r.filePath, 600);
        url = data?.signedUrl ?? null;
      }
      sheets.push({ docType: r.docType, label: r.label, number: r.number, fileName: r.fileName, status: r.status, url, created: r.created });
    }
    setReady(sheets);
    setBusy(false);
    setTimeout(() => window.print(), 400);
  }

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="print:hidden">
        <h1 className="page-title">Print documents</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Select the documents to include, then print the set.
        </p>
        <div className="space-y-2 rounded-lg border p-4">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded for this customer.</p>}
          {rows.map((r) => (
            <label key={r.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
              <Checkbox
                checked={!!selected[r.id]}
                onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: !!v }))}
              />
              <span className="flex-1">
                <span className="font-medium">{r.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {r.fileName ?? "No file"} · {r.status} · {fmtDate(r.created)}
                </span>
              </span>
            </label>
          ))}
          <Button className="mt-2" size="sm" disabled={busy || rows.every((r) => !selected[r.id])} onClick={build}>
            <Printer className="mr-1 h-4 w-4" /> {busy ? "Preparing…" : "Prepare & print"}
          </Button>
        </div>
      </div>

      {ready && (
        <div className="mt-6 space-y-6 print:mt-0">
          <div className="border-b pb-3 text-center">
            <h2 className="text-xl font-bold">{DEALER.name}</h2>
            <p className="text-xs text-muted-foreground">{DEALER.tagline}</p>
            <p className="mt-2 text-sm font-semibold">
              Document set · {customer?.customer_name ?? ""} · {customer?.mobile ?? ""}
            </p>
          </div>
          {ready.map((s, i) => (
            <div key={`${s.docType}-${i}`} className="break-after-page">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="mb-2 text-xs text-muted-foreground">
                {s.number ? `No. ${s.number} · ` : ""}{s.status} · uploaded {fmtDate(s.created)}
              </p>
              {s.url ? (
                <img src={s.url} alt={s.label} className="max-h-[900px] w-full object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">No file attached.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
