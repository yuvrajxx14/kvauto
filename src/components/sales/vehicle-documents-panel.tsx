import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/sales";

export const VEHICLE_DOC_TYPES = [
  { key: "COMPANY_INVOICE", label: "Mahindra company purchase invoice", hasNumber: true },
  { key: "CHASSIS_PRINT", label: "Chassis print", hasNumber: false },
] as const;

export type VehicleDoc = {
  id: string;
  tractor_stock_id: string;
  doc_type: string;
  file_path: string;
  file_name: string | null;
  document_number: string | null;
  created_at: string;
};

export function useVehicleDocuments(stockId: string | undefined) {
  return useQuery({
    queryKey: ["vehicle-documents", stockId ?? ""],
    enabled: !!stockId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_documents")
        .select("*")
        .eq("tractor_stock_id", stockId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VehicleDoc[];
    },
  });
}

export async function openVehicleDoc(path: string) {
  const { data, error } = await supabase.storage.from("vehicle-documents").createSignedUrl(path, 120);
  if (error || !data) {
    toast.error("Could not open file");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

/** Prompts staff to attach the two papers that arrive with every tractor. */
export function VehicleDocumentsPanel({ stockId, readOnly }: { stockId: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: docs } = useVehicleDocuments(stockId);
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const upload = useMutation({
    mutationFn: async ({ docType, file, number }: { docType: string; file: File; number: string }) => {
      const path = `${stockId}/${docType}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("vehicle-documents").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("stock_documents").insert({
        tractor_stock_id: stockId,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        document_number: number || null,
        uploaded_by: me?.profile.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document attached to this tractor");
      qc.invalidateQueries({ queryKey: ["vehicle-documents", stockId] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(null),
  });

  const done = VEHICLE_DOC_TYPES.filter((t) => (docs ?? []).some((d) => d.doc_type === t.key)).length;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Vehicle documents</CardTitle>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            done === VEHICLE_DOC_TYPES.length
              ? "border-success/30 bg-success/12 text-success"
              : "border-warning/40 bg-warning/15 text-warning-foreground",
          )}
        >
          {done}/{VEHICLE_DOC_TYPES.length} attached
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {VEHICLE_DOC_TYPES.map((t) => {
          const latest = (docs ?? []).find((d) => d.doc_type === t.key);
          return (
            <div key={t.key} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {latest ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {latest
                        ? `${latest.file_name ?? "File"} · ${fmtDate(latest.created_at)}${latest.document_number ? ` · ${latest.document_number}` : ""}`
                        : "Not attached — required for the passing set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly && t.hasNumber && (
                    <Input
                      className="h-8 w-44"
                      placeholder="Invoice number"
                      defaultValue={latest?.document_number ?? ""}
                      id={`vnum-${t.key}`}
                    />
                  )}
                  {latest && (
                    <Button size="sm" variant="outline" onClick={() => openVehicleDoc(latest.file_path)}>
                      View
                    </Button>
                  )}
                  {!readOnly && (
                    <>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        ref={(el) => {
                          inputs.current[t.key] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const numEl = document.getElementById(`vnum-${t.key}`) as HTMLInputElement | null;
                          setBusy(t.key);
                          upload.mutate({ docType: t.key, file, number: numEl?.value ?? "" });
                          e.target.value = "";
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === t.key}
                        onClick={() => inputs.current[t.key]?.click()}
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        {latest ? "Replace" : "Upload"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
