import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { DocumentsPanel, documentProgress } from "@/components/sales/documents-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooking, useCustomerDocuments, useDocumentChecklist } from "@/lib/erp";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/delivery/$bookingId")({
  head: () => ({
    meta: [
      { title: "Complete delivery \u00b7 KrushiVidhya Automobiles" },
      { name: "description", content: "Validate payment, PDI and documents before handing over the tractor." },
      { property: "og:title", content: "Complete delivery \u00b7 KrushiVidhya Automobiles" },
      { property: "og:description", content: "Delivery validation checklist and handover." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeliveryDetail,
});

function DeliveryDetail() {
  const { bookingId } = Route.useParams();
  const qc = useQueryClient();
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: checklist } = useDocumentChecklist();
  const { data: docs } = useCustomerDocuments(b?.customer_id ?? "");

  const complete = useMutation({
    mutationFn: async (payload: { delivery_date: string; remarks: string }) => {
      const { data, error } = await supabase.rpc("complete_delivery_atomic", {
        _booking_id: bookingId,
        _delivery_date: payload.delivery_date,
        _remarks: payload.remarks,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Delivery completed");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading\u2026</p>;
  if (!b) return <PageHeader title="Booking not found" />;

  const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
  const delivery = Array.isArray(b.delivery) ? b.delivery[0] : b.delivery;
  const outstanding = Math.max(0, Number(b.final_price ?? 0) - Number(b.amount_received ?? 0));
  const progress = documentProgress(checklist ?? [], docs ?? []);
  const checks = [
    { label: "Tractor allocated", ok: !!alloc },
    { label: "PDI passed", ok: alloc?.stock?.pdi_status === "PASSED" },
    { label: "Inspection passed", ok: alloc?.stock?.inspection_status === "PASSED" },
    { label: "Full payment received", ok: outstanding <= 0 },
    { label: "Required documents verified", ok: progress.complete },
  ];
  const ready = checks.every((c) => c.ok);

  return (
    <div>
      <PageHeader
        title={`Delivery \u00b7 ${b.booking_number}`}
        subtitle={`${b.customer?.customer_name ?? "\u2014"} \u00b7 ${b.tractor_model}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/delivery"><ArrowLeft className="mr-1 h-4 w-4" /> Delivery list</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Validation checklist</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span>{c.label}</span>
              </div>
            ))}
            <Field label="Outstanding">{inr(outstanding)}</Field>
            <Field label="Chassis">{alloc?.chassis_number ?? "\u2014"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Handover</CardTitle></CardHeader>
          <CardContent>
            {delivery ? (
              <div className="space-y-2 text-sm">
                <Field label="Delivered on">{fmtDate(delivery.delivery_date)}</Field>
                <Field label="Remarks">{delivery.remarks || "\u2014"}</Field>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  complete.mutate({
                    delivery_date: String(fd.get("delivery_date")),
                    remarks: String(fd.get("remarks") || ""),
                  });
                }}
              >
                <div><Label>Delivery date</Label><Input name="delivery_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
                <div><Label>Remarks</Label><Textarea name="remarks" rows={3} /></div>
                <Button className="w-full" disabled={!ready || complete.isPending}>
                  {complete.isPending ? "Completing\u2026" : ready ? "Complete Delivery" : "Checklist incomplete"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <DocumentsPanel customerId={b.customer_id} />
      </div>
    </div>
  );
}
