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
import { CHECK_LABEL, CHECK_STATUSES, STOCK_STATUSES, STOCK_STATUS_LABEL, type CheckStatus, type StockStatus } from "@/lib/stock";
import { fmtDate } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/stock/$stockId")({
  head: () => ({
    meta: [
      { title: "Stock unit · KrushiVidhya Automobiles" },
      { name: "description", content: "Chassis-wise tractor record with inspection, PDI and delivery checks." },
      { property: "og:title", content: "Stock unit · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Inspection, PDI and delivery readiness for a tractor unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockDetail,
});

function StockDetail() {
  const { stockId } = Route.useParams();
  const qc = useQueryClient();
  const { data: u, isLoading } = useStockItem(stockId);

  const update = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      const { error } = await supabase.from("tractor_stock").update(patch).eq("id", stockId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock updated");
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
          <Button asChild variant="outline" size="sm">
            <Link to="/stock"><ArrowLeft className="mr-1 h-4 w-4" /> All stock</Link>
          </Button>
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
          <CardHeader className="pb-2"><CardTitle className="text-base">Checks</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {([
              ["inspection", "Inspection", u.inspection_status, u.inspection_remarks],
              ["pdi", "PDI", u.pdi_status, u.pdi_remarks],
              ["delivery_check", "Delivery check", u.delivery_check_status, u.delivery_check_remarks],
            ] as const).map(([key, label, value, remarks]) => (
              <form
                key={key}
                className="grid gap-2 rounded-md border p-3 md:grid-cols-[160px_1fr_auto] md:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  update.mutate({
                    [`${key}_status`]: String(fd.get("status")),
                    [`${key}_remarks`]: String(fd.get("remarks") || ""),
                  });
                }}
              >
                <div>
                  <Label>{label}</Label>
                  <div className="mb-1"><CheckBadge status={(value as CheckStatus) ?? "PENDING"} /></div>
                  <Select name="status" defaultValue={value ?? "PENDING"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CHECK_STATUSES.map((c) => <SelectItem key={c} value={c}>{CHECK_LABEL[c]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Remarks</Label><Textarea name="remarks" defaultValue={remarks ?? ""} rows={2} /></div>
                <Button size="sm" disabled={update.isPending}>Save</Button>
              </form>
            ))}

            <form
              className="flex items-end gap-2 rounded-md border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                update.mutate({ status: String(fd.get("status")) });
              }}
            >
              <div className="flex-1">
                <Label>Stock status</Label>
                <Select name="status" defaultValue={u.status}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STOCK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STOCK_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" disabled={update.isPending}>Update status</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
