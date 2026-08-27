import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerDocuments, useDocumentChecklist } from "@/lib/erp";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/sales";

type Doc = {
  id: string;
  doc_type: string;
  document_number: string | null;
  verification_status: string;
  created_at: string;
};

/** A document counts as collected when its row is marked RECEIVED (physically in the customer file). */
export function documentProgress(
  checklist: { doc_type: string; label?: string; is_required: boolean }[],
  docs: { doc_type: string; verification_status: string }[],
) {
  const isReceived = (docType: string) =>
    docs.some((d) => d.doc_type === docType && d.verification_status === "RECEIVED");
  const required = checklist.filter((c) => c.is_required);
  const collected = required.filter((c) => isReceived(c.doc_type));
  const missing = required.filter((c) => !isReceived(c.doc_type));
  return {
    required: required.length,
    uploaded: collected.length,
    verified: collected.length,
    collected: collected.length,
    complete: required.length === 0 || missing.length === 0,
    missing: missing.map((c) => c.doc_type),
    missingLabels: missing.map((c) => c.label ?? c.doc_type),
  };
}

export function DocumentsPanel({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: checklist } = useDocumentChecklist();
  const { data: docs } = useCustomerDocuments(customerId);

  const setStatus = useMutation({
    mutationFn: async ({
      docType,
      received,
      existingId,
      number,
    }: {
      docType: string;
      received: boolean;
      existingId?: string;
      number?: string;
    }) => {
      const payload = {
        verification_status: received ? "RECEIVED" : "PENDING",
        document_number: number || null,
      };
      if (existingId) {
        const { error } = await supabase.from("customer_documents").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_documents").insert({
          customer_id: customerId,
          doc_type: docType,
          uploaded_by: me?.profile.id ?? null,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-documents", customerId] });
      qc.invalidateQueries({ queryKey: ["pending-doc-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const progress = documentProgress(checklist ?? [], (docs ?? []) as Doc[]);

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Document collection checklist</CardTitle>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              progress.complete
                ? "border-success/30 bg-success/12 text-success"
                : "border-warning/40 bg-warning/15 text-warning-foreground",
            )}
          >
            {progress.collected}/{progress.required} collected
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          Documents are collected physically and kept in the customer file. Tick each one as you receive the hard copy.
        </p>
        {(checklist ?? []).map((c) => {
          const latest = ((docs ?? []) as Doc[]).find((d) => d.doc_type === c.doc_type);
          const received = latest?.verification_status === "RECEIVED";
          return (
            <div
              key={c.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-md border p-3",
                received ? "border-success/30 bg-success/5" : "",
              )}
            >
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={received}
                  onCheckedChange={(v) => {
                    const numEl = document.getElementById(`num-${c.doc_type}`) as HTMLInputElement | null;
                    setStatus.mutate({
                      docType: c.doc_type,
                      received: !!v,
                      ...(latest ? { existingId: latest.id } : {}),
                      ...(numEl ? { number: numEl.value } : {}),
                    });
                  }}
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {received ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    {c.label}
                    {c.is_required && <span className="text-destructive">*</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {received ? `Collected · ${fmtDate(latest!.created_at)}` : "Not collected yet"}
                  </span>
                </span>
              </label>

              {c.has_number && (
                <Input
                  className="h-8 w-44"
                  placeholder="Document number"
                  defaultValue={latest?.document_number ?? ""}
                  id={`num-${c.doc_type}`}
                  onBlur={(e) => {
                    if (!latest || (latest.document_number ?? "") === e.target.value) return;
                    setStatus.mutate({
                      docType: c.doc_type,
                      received,
                      existingId: latest.id,
                      number: e.target.value,
                    });
                  }}
                />
              )}
            </div>
          );
        })}
        {!checklist?.length && <p className="text-sm text-muted-foreground">No checklist configured.</p>}
        {!progress.complete && (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs font-medium text-warning-foreground">
            Pending: {progress.missingLabels.join(", ")}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => qc.invalidateQueries({ queryKey: ["customer-documents", customerId] })}
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
