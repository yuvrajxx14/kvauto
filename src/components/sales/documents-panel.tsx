import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, Upload, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerDocuments, useDocumentChecklist } from "@/lib/erp";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/sales";

type Doc = {
  id: string;
  doc_type: string;
  document_number: string | null;
  file_path: string | null;
  file_name: string | null;
  verification_status: string;
  created_at: string;
};

export function documentProgress(
  checklist: { doc_type: string; is_required: boolean }[],
  docs: { doc_type: string; verification_status: string }[],
) {
  const required = checklist.filter((c) => c.is_required);
  const done = required.filter((c) =>
    docs.some((d) => d.doc_type === c.doc_type && d.verification_status !== "REJECTED"),
  );
  const verified = required.filter((c) =>
    docs.some((d) => d.doc_type === c.doc_type && d.verification_status === "VERIFIED"),
  );
  return {
    required: required.length,
    uploaded: done.length,
    verified: verified.length,
    complete: required.length > 0 && verified.length === required.length,
    missing: required.filter((c) => !docs.some((d) => d.doc_type === c.doc_type)).map((c) => c.doc_type),
  };
}

export function DocumentsPanel({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: checklist } = useDocumentChecklist();
  const { data: docs } = useCustomerDocuments(customerId);
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const upload = useMutation({
    mutationFn: async ({ docType, file, number }: { docType: string; file: File; number: string }) => {
      const path = `${customerId}/${docType}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("customer-documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("customer_documents").insert({
        customer_id: customerId,
        doc_type: docType,
        document_number: number || null,
        file_path: path,
        file_name: file.name,
        uploaded_by: me?.profile.id ?? null,
        verification_status: "PENDING",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["customer-documents", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  const verify = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("customer_documents")
        .update({ verification_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document updated");
      qc.invalidateQueries({ queryKey: ["customer-documents", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from("customer-documents").createSignedUrl(path, 120);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const progress = documentProgress(checklist ?? [], (docs ?? []) as Doc[]);

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Documents</CardTitle>
        <Link
          to="/print/documents/$customerId"
          params={{ customerId }}
          target="_blank"
          className="text-xs text-primary hover:underline"
        >
          Print documents
        </Link>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            progress.complete
              ? "border-success/30 bg-success/12 text-success"
              : "border-warning/40 bg-warning/15 text-warning-foreground",
          )}
        >
          {progress.verified}/{progress.required} verified
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {(checklist ?? []).map((c) => {
          const existing = ((docs ?? []) as Doc[]).filter((d) => d.doc_type === c.doc_type);
          const latest = existing[0];
          return (
            <div key={c.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {latest?.verification_status === "VERIFIED" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : latest?.verification_status === "REJECTED" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : latest ? (
                    <Clock className="h-4 w-4 text-warning" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {c.label}
                      {c.is_required && <span className="ml-1 text-destructive">*</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {latest
                        ? `${latest.file_name ?? "File"} · ${fmtDate(latest.created_at)} · ${latest.verification_status}`
                        : "Not uploaded"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {c.has_number && (
                    <Input
                      className="h-8 w-40"
                      placeholder="Document number"
                      defaultValue={latest?.document_number ?? ""}
                      id={`num-${c.doc_type}`}
                    />
                  )}
                  {latest?.file_path && (
                    <Button size="sm" variant="outline" onClick={() => openFile(latest.file_path!)}>
                      View
                    </Button>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    ref={(el) => {
                      inputs.current[c.doc_type] = el;
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const numEl = document.getElementById(`num-${c.doc_type}`) as HTMLInputElement | null;
                      setBusy(c.doc_type);
                      upload.mutate({ docType: c.doc_type, file, number: numEl?.value ?? "" });
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === c.doc_type}
                    onClick={() => inputs.current[c.doc_type]?.click()}
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    {latest ? "Replace" : "Upload"}
                  </Button>
                  {me?.isManagement && latest && latest.verification_status !== "VERIFIED" && (
                    <Button size="sm" onClick={() => verify.mutate({ id: latest.id, status: "VERIFIED" })}>
                      Verify
                    </Button>
                  )}
                  {me?.isManagement && latest && latest.verification_status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verify.mutate({ id: latest.id, status: "REJECTED" })}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!checklist?.length && <p className="text-sm text-muted-foreground">No checklist configured.</p>}
      </CardContent>
    </Card>
  );
}
