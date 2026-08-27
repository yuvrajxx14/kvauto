import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { StockBadge, CheckBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStockItem } from "@/lib/erp";
import { type CheckStatus, type StockStatus } from "@/lib/stock";
import { fmtDate } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/stock/$stockId")({
  head: () => ({
    meta: [
      { title: "Stock unit · KrushiVidhya Automobiles" },
      { name: "description", content: "Chassis-wise tractor record with NTIR inspection and PDI results." },
      { property: "og:title", content: "Stock unit · KrushiVidhya Automobiles" },
      { property: "og:description", content: "NTIR and PDI status for a tractor unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockDetail,
});

const RESULTS = ["PASSED", "FAILED"] as const;

function StockDetail() {
  const { stockId } = Route.useParams();
  const qc = useQueryClient();
  const { data: u, isLoading } = useStockItem(stockId);

  const save = useMutation({
    mutationFn: async (p: { ntir: string; pdi: string; remarks: string }) => {
      const bothPassed = p.ntir === "PASSED" && p.pdi === "PASSED";
      const patch: Record<string, string> = {
        inspection_status: p.ntir,
        pdi_status: p.pdi,
        delivery_check_status: bothPassed ? "PASSED" : "FAILED",
        inspection_remarks: p.remarks,
        pdi_remarks: p.remarks,
        delivery_check_remarks: p.remarks,
      };
      // Only move stock status when the unit is not already reserved/allocated/delivered.
      const movable = ["ORDERED", "IN_TRANSIT", "RECEIVED", "INSPECTION_PENDING", "PDI_PENDING", "INSPECTION_FAILED", "HOLD", "AVAILABLE"];
      if (u && movable.includes(String(u.status))) {
        patch['status'] = bothPassed ? "AVAILABLE" : "INSPECTION_FAILED";
      }
      const { error } = await supabase.from("tractor_stock").update(patch as never).eq("id", stockId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Checks saved");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!u) return <PageHeader title="Stock unit not found" />;

  return (
    <div>
      <PageHeader
        title={u.chassis_number}
        subtitle={`${u.model} · ${u.variant ?? "—"} · ${u.location}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/stock"><ArrowLeft className="mr-1 h-4 w-4" /> All stock</Link>
            </Button>
            <DeleteRecordButton table="tractor_stock" id={stockId} label="this stock unit" onDeleted={() => navigate({ to: "/stock" })} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Unit details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Field label="Engine number">{u.engine_number}</Field>
            <Field label="Colour">{u.colour ?? "—"}</Field>
            <Field label="Mfg year">{u.mfg_year ?? "—"}</Field>
            <Field label="Arrival date">{fmtDate(u.arrival_date)}</Field>
            <Field label="Order reference">{u.order_reference ?? "—"}</Field>
            <div className="pt-1"><StockBadge status={u.status as StockStatus} /></div>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Receiving checks</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>NTIR</span><CheckBadge status={(u.inspection_status as CheckStatus) ?? "PENDING"} />
              <span>PDI</span><CheckBadge status={(u.pdi_status as CheckStatus) ?? "PENDING"} />
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save.mutate({
                  ntir: String(fd.get("ntir")),
                  pdi: String(fd.get("pdi")),
                  remarks: String(fd.get("remarks") ?? ""),
                });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>NTIR inspection</Label>
                  <Select name="ntir" defaultValue={u.inspection_status === "FAILED" ? "FAILED" : "PASSED"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESULTS.map((r) => <SelectItem key={r} value={r}>{r === "PASSED" ? "Passed" : "Failed"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PDI</Label>
                  <Select name="pdi" defaultValue={u.pdi_status === "FAILED" ? "FAILED" : "PASSED"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESULTS.map((r) => <SelectItem key={r} value={r}>{r === "PASSED" ? "Passed" : "Failed"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Remarks</Label><Textarea name="remarks" rows={2} defaultValue={u.pdi_remarks ?? ""} /></div>
              <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save checks"}</Button>
              <p className="text-xs text-muted-foreground">
                Saving updates NTIR, PDI, delivery check and stock status together. Both must pass before the unit can be delivered.
              </p>
            </form>
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
        </div>
      </div>
    </div>
  );
}
