import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooking, usePassingRecord, useSubsidyCase } from "@/lib/erp";
import { PASSING_STEPS, SUBSIDY_CHECKLIST } from "@/lib/passing";
import { fmtDate, inr, todayISO } from "@/lib/sales";
import { VehicleDocumentsPanel } from "@/components/sales/vehicle-documents-panel";

export const Route = createFileRoute("/_authenticated/passing/$bookingId")({
  head: () => ({
    meta: [
      { title: "Passing file · KrushiVidhya Automobiles" },
      { name: "description", content: "Invoice, insurance, RTO passing steps and the subsidy file checklist for a delivered tractor." },
      { property: "og:title", content: "Passing file · KrushiVidhya Automobiles" },
      { property: "og:description", content: "RTO passing steps and subsidy file checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PassingDetail,
});

function PassingDetail() {
  const { bookingId } = Route.useParams();
  const qc = useQueryClient();
  const { data: b } = useBooking(bookingId);
  const { data: rec, isLoading } = usePassingRecord(bookingId);
  const { data: subsidy } = useSubsidyCase(bookingId);

  const start = useMutation({
    mutationFn: async () => {
      if (!b) throw new Error("Booking not loaded");
      const { data, error } = await supabase
        .from("passing_records")
        .insert({ booking_id: bookingId, customer_id: b.customer_id })
        .select("id")
        .single();
      if (error) throw error;
      const rows = SUBSIDY_CHECKLIST.map((c, i) => ({
        passing_id: data.id,
        item_key: c.key,
        label: c.label,
        provided_by: c.provided_by,
        sort_order: i + 1,
      }));
      const { error: e2 } = await supabase.from("passing_checklist").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Passing file started"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!rec) throw new Error("No passing record");
      const { error } = await supabase.from("passing_records").update(patch as never).eq("id", rec.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  const tick = useMutation({
    mutationFn: async (p: { id: string; is_done: boolean }) => {
      const { error } = await supabase.from("passing_checklist").update({ is_done: p.is_done }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!b || isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const outstanding = Math.max(0, Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0));
  const blocked = outstanding >= 1;
  const allocRaw = (b as unknown as { allocation?: unknown }).allocation;
  const alloc = (Array.isArray(allocRaw) ? allocRaw[0] : allocRaw) as { tractor_stock_id?: string } | undefined;
  const checklist = [...((rec?.checklist as Array<{ id: string; label: string; provided_by: string; is_done: boolean; sort_order: number }>) ?? [])].sort(
    (x, y) => x.sort_order - y.sort_order,
  );

  return (
    <div>
      <PageHeader
        title={`Passing · ${b.booking_number}`}
        subtitle={`${b.customer?.customer_name ?? "—"} · ${b.tractor_model}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/passing"><ArrowLeft className="mr-1 h-4 w-4" /> Passing list</Link></Button>
            <Button asChild size="sm">
              <Link to="/print/invoice/$bookingId" params={{ bookingId }} target="_blank">
                <Printer className="mr-1 h-4 w-4" /> Tax invoice
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/print/documents/$customerId" params={{ customerId: b.customer_id }} target="_blank">
                <Printer className="mr-1 h-4 w-4" /> Print documents
              </Link>
            </Button>

          </div>
        }
      />

      {blocked && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Passing is blocked — deal price, loan document charge and insurance must be fully received. Outstanding {inr(outstanding)}.
        </div>
      )}

      {!rec ? (
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">No passing file started for this booking yet.</p>
            <Button disabled={blocked || start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? "Starting…" : "Start passing file"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Passing sequence</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {PASSING_STEPS.map((s) => (
                <label key={s.field} className="flex items-start gap-3 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={!!(rec as Record<string, unknown>)[s.field]}
                    disabled={blocked}
                    onCheckedChange={(v) =>
                      update.mutate(
                        s.field === "subsidy_file_created" && v
                          ? { subsidy_file_created: true, subsidy_file_date: rec.invoice_date ?? todayISO() }
                          : { [s.field]: !!v },
                      )
                    }
                  />
                  <span>{s.label}</span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                The subsidy file is dated with the RTO invoice date so numbers and dates never mismatch.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">File details</CardTitle></CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  update.mutate({
                    invoice_number: String(fd.get("invoice_number") ?? "") || null,
                    invoice_date: String(fd.get("invoice_date") ?? "") || null,
                    insurance_policy_number: String(fd.get("insurance_policy_number") ?? "") || null,
                    set_sent_date: String(fd.get("set_sent_date") ?? "") || null,
                    rto_number: String(fd.get("rto_number") ?? "") || null,
                    remarks: String(fd.get("remarks") ?? "") || null,
                  });
                  toast.success("Passing details saved");
                }}
              >
                <div><Label>Invoice number</Label><Input name="invoice_number" defaultValue={rec.invoice_number ?? ""} /></div>
                <div><Label>Invoice date</Label><Input name="invoice_date" type="date" defaultValue={rec.invoice_date ?? ""} /></div>
                <div><Label>Insurance policy number</Label><Input name="insurance_policy_number" defaultValue={rec.insurance_policy_number ?? ""} /></div>
                <div><Label>Set sent for passing on</Label><Input name="set_sent_date" type="date" defaultValue={rec.set_sent_date ?? ""} /></div>
                <div><Label>RTO number</Label><Input name="rto_number" defaultValue={rec.rto_number ?? ""} /></div>
                <div><Label>Remarks</Label><Textarea name="remarks" rows={2} defaultValue={rec.remarks ?? ""} /></div>
                <Button disabled={update.isPending}>Save details</Button>
              </form>
              <div className="mt-4 space-y-1 border-t pt-3">
                <Field label="Subsidy file date">{fmtDate(rec.subsidy_file_date)}</Field>
                <Field label="Use type">{subsidy?.use_type ?? "—"}</Field>
                <Field label="Application">{subsidy?.application_status ?? "—"}</Field>
                <Field label="Approval">{subsidy?.approval_status ?? "—"}</Field>
              </div>
            </CardContent>
          </Card>

          {alloc?.tractor_stock_id && (
            <div className="lg:col-span-3">
              <VehicleDocumentsPanel stockId={alloc.tractor_stock_id} readOnly />
            </div>
          )}

          <Card className="print-area shadow-card lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Subsidy file checklist</CardTitle>
              <Button size="sm" variant="outline" data-print-hide onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Print checklist
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {checklist.map((c) => (
                <label key={c.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                  <Checkbox checked={c.is_done} onCheckedChange={(v) => tick.mutate({ id: c.id, is_done: !!v })} />
                  <span className="flex-1">{c.label}</span>
                  <Badge variant={c.provided_by === "CUSTOMER" ? "outline" : "secondary"}>
                    {c.provided_by === "CUSTOMER" ? "With customer" : "Dealer"}
                  </Badge>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
