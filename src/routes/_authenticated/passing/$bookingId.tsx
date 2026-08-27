import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Printer } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooking, usePassingRecord, useSubsidyCase } from "@/lib/erp";
import { SUBSIDY_CHECKLIST } from "@/lib/passing";
import { fmtDate, inr, todayISO } from "@/lib/sales";
import { VehicleDocumentsPanel } from "@/components/sales/vehicle-documents-panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/passing/$bookingId")({
  head: () => ({
    meta: [
      { title: "Passing file · KrushiVidhya Automobiles" },
      { name: "description", content: "Application, approval, payment, RTO passing set, number plate fitment and subsidy file for a delivered tractor." },
      { property: "og:title", content: "Passing file · KrushiVidhya Automobiles" },
      { property: "og:description", content: "RTO passing steps and subsidy file checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PassingDetail,
});

function Step({
  n,
  title,
  done,
  locked,
  hint,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  locked?: boolean;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-3", locked && "opacity-55")}>
      <div className="flex items-start gap-3">
        {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /> : <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-sm font-semibold">{n}. {title}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          {!locked && children && <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

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

  const updateSubsidy = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!subsidy) throw new Error("No subsidy case for this booking");
      const { error } = await supabase.from("subsidy_cases").update(patch as never).eq("id", subsidy.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subsidy status updated"); qc.invalidateQueries(); },
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
  const paymentOk = outstanding < 1;
  const allocRaw = (b as unknown as { allocation?: unknown }).allocation;
  const alloc = (Array.isArray(allocRaw) ? allocRaw[0] : allocRaw) as { tractor_stock_id?: string } | undefined;
  const checklist = [...((rec?.checklist as Array<{ id: string; label: string; provided_by: string; is_done: boolean; sort_order: number }>) ?? [])].sort(
    (x, y) => x.sort_order - y.sort_order,
  );

  const agri = subsidy?.use_type !== "COMMERCIAL";
  const applicationDone = !agri || subsidy?.application_status === "DONE";
  const approved = !agri || subsidy?.approval_status === "APPROVED";
  const canPrintSet = applicationDone && approved && paymentOk;

  const r = rec;

  return (
    <div>
      <PageHeader
        title={`Passing · ${b.booking_number}`}
        subtitle={`${b.customer?.customer_name ?? "—"} · ${b.tractor_model}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/passing"><ArrowLeft className="mr-1 h-4 w-4" /> Passing list</Link></Button>
            <Button asChild size="sm">
              <Link to="/print/invoice/$bookingId" params={{ bookingId }} target="_blank">
                <Printer className="mr-1 h-4 w-4" /> Tax invoice
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/print/documents/$customerId" params={{ customerId: b.customer_id }} target="_blank">
                <Printer className="mr-1 h-4 w-4" /> Customer documents
              </Link>
            </Button>
          </div>
        }
      />

      {!rec ? (
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">No passing file started for this booking yet.</p>
            <Button disabled={start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? "Starting…" : "Start passing file"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">After-delivery flow</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Step
                n={1}
                title="Online subsidy application"
                done={applicationDone}
                hint={
                  !agri
                    ? "Commercial use — no subsidy application needed."
                    : applicationDone
                      ? `Applied on ${fmtDate(subsidy?.application_date ?? null)}`
                      : "Tagged: Application pending"
                }
              >
                {agri && subsidy && (
                  <Select
                    value={subsidy.application_status}
                    onValueChange={(v) =>
                      updateSubsidy.mutate({ application_status: v, application_date: v === "DONE" ? (subsidy.application_date ?? todayISO()) : null })
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Not done</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Step>

              <Step
                n={2}
                title="Government approval"
                done={approved}
                locked={!applicationDone}
                hint={
                  !agri
                    ? "Not applicable."
                    : !applicationDone
                      ? "Waiting for the online application"
                      : approved
                        ? `Approved on ${fmtDate(subsidy?.approval_date ?? null)}`
                        : "Tagged: Approval pending"
                }
              >
                {agri && subsidy && (
                  <Select
                    value={subsidy.approval_status}
                    onValueChange={(v) =>
                      updateSubsidy.mutate({ approval_status: v, approval_date: v === "APPROVED" ? (subsidy.approval_date ?? todayISO()) : null })
                    }
                  >
                    <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Not approved</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Step>

              <Step
                n={3}
                title="Payment check"
                done={paymentOk}
                locked={!approved}
                hint={paymentOk ? "Full amount received" : `Outstanding ${inr(outstanding)} — clear it before printing the passing set`}
              >
                <Button asChild size="sm" variant="outline">
                  <Link to="/bookings/$bookingId" params={{ bookingId }}>Open booking</Link>
                </Button>
              </Step>

              <Step
                n={4}
                title="Print passing document set"
                done={!!r?.passing_set_printed}
                locked={!canPrintSet}
                hint={
                  r?.passing_set_printed
                    ? `Printed on ${fmtDate(r.passing_set_printed_date)}`
                    : "Invoice, Form 22, Aadhaar, PAN/Voter ID, 7-12-8A, company invoice, chassis print"
                }
              >
                <Button asChild size="sm">
                  <Link to="/print/passing-set/$bookingId" params={{ bookingId }} target="_blank">
                    <Printer className="mr-1 h-4 w-4" /> Print set
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update.mutate({
                      passing_set_printed: !r?.passing_set_printed,
                      passing_set_printed_date: r?.passing_set_printed ? null : todayISO(),
                      form22_printed: !r?.passing_set_printed,
                    })
                  }
                >
                  {r?.passing_set_printed ? "Undo printed" : "Mark printed"}
                </Button>
              </Step>

              <Step
                n={5}
                title="Set sent to RTO"
                done={!!r?.sent_to_rto}
                locked={!r?.passing_set_printed}
                hint={r?.sent_to_rto ? `Sent on ${fmtDate(r.sent_to_rto_date)}` : "Send the printed set to the RTO"}
              >
                <Button
                  size="sm"
                  variant={r?.sent_to_rto ? "outline" : "default"}
                  onClick={() =>
                    update.mutate({
                      sent_to_rto: !r?.sent_to_rto,
                      sent_to_rto_date: r?.sent_to_rto ? null : todayISO(),
                      set_sent_for_passing: !r?.sent_to_rto,
                      set_sent_date: r?.sent_to_rto ? null : todayISO(),
                    })
                  }
                >
                  {r?.sent_to_rto ? "Undo sent" : "Mark sent to RTO"}
                </Button>
              </Step>

              <Step
                n={6}
                title="RTO receipt & screen report received"
                done={!!r?.rto_receipt_received && !!r?.screen_report_received}
                locked={!r?.sent_to_rto}
                hint="Tick each as it comes back from the RTO, then save the RTO number below."
              >
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!r?.rto_receipt_received} onCheckedChange={(v) => update.mutate({ rto_receipt_received: !!v })} />
                  RTO payment receipt
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!r?.screen_report_received} onCheckedChange={(v) => update.mutate({ screen_report_received: !!v })} />
                  Screen report
                </label>
              </Step>

              <Step
                n={7}
                title="Number plate ordered"
                done={!!r?.number_plate_ordered}
                locked={!r?.screen_report_received}
                hint={r?.number_plate_ordered ? `Ordered on ${fmtDate(r.number_plate_ordered_date)}` : "Order the plate once the RTO number is known"}
              >
                <Button
                  size="sm"
                  variant={r?.number_plate_ordered ? "outline" : "default"}
                  onClick={() =>
                    update.mutate({
                      number_plate_ordered: !r?.number_plate_ordered,
                      number_plate_ordered_date: r?.number_plate_ordered ? null : todayISO(),
                    })
                  }
                >
                  {r?.number_plate_ordered ? "Undo order" : "Mark ordered"}
                </Button>
              </Step>

              <Step
                n={8}
                title="Number plate received & fitted"
                done={!!r?.number_plate_received && !!r?.fitment_date}
                locked={!r?.number_plate_ordered}
                hint={r?.fitment_date ? `Fitted on ${fmtDate(r.fitment_date)}` : "Record the fitment date after fitting the plate"}
              >
                <Button
                  size="sm"
                  variant={r?.number_plate_received ? "outline" : "default"}
                  onClick={() =>
                    update.mutate({
                      number_plate_received: !r?.number_plate_received,
                      number_plate_received_date: r?.number_plate_received ? null : todayISO(),
                    })
                  }
                >
                  {r?.number_plate_received ? "Undo received" : "Mark received"}
                </Button>
                <Input
                  className="h-8 w-[180px] uppercase"
                  placeholder="Number plate e.g. GJ03NK5189"
                  defaultValue={r?.number_plate_number ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.toUpperCase().replace(/\s+/g, "");
                    if (v !== (r?.number_plate_number ?? "")) update.mutate({ number_plate_number: v || null });
                  }}
                />
                <Input
                  type="date"
                  className="h-8 w-[170px]"
                  defaultValue={r?.fitment_date ?? ""}
                  onChange={(e) => update.mutate({ fitment_date: e.target.value || null })}
                />
              </Step>

              <Step
                n={9}
                title="Print subsidy file documents"
                done={!!r?.subsidy_file_printed}
                locked={!r?.passing_set_printed}
                hint={
                  r?.subsidy_file_printed
                    ? `Printed on ${fmtDate(r.subsidy_file_printed_date)}`
                    : "Available once the passing set is printed"
                }
              >
                <Button asChild size="sm">
                  <Link to="/print/subsidy-file/$bookingId" params={{ bookingId }} target="_blank">
                    <Printer className="mr-1 h-4 w-4" /> Print subsidy file
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update.mutate({
                      subsidy_file_printed: !r?.subsidy_file_printed,
                      subsidy_file_printed_date: r?.subsidy_file_printed ? null : todayISO(),
                      subsidy_file_status: r?.subsidy_file_printed ? "PENDING" : "PRINTED",
                      subsidy_file_created: !r?.subsidy_file_printed,
                      subsidy_file_date: r?.subsidy_file_printed ? null : (r?.invoice_date ?? todayISO()),
                    })
                  }
                >
                  {r?.subsidy_file_printed ? "Undo printed" : "Mark printed"}
                </Button>
              </Step>

              <Step
                n={10}
                title="Subsidy file uploaded"
                done={r?.subsidy_file_status === "UPLOADED"}
                locked={!r?.subsidy_file_printed}
                hint={
                  r?.subsidy_file_status === "UPLOADED"
                    ? `Uploaded on ${fmtDate(r.subsidy_file_uploaded_date)}`
                    : "Update the status once the file is uploaded to the portal"
                }
              >
                <Select
                  value={r?.subsidy_file_status ?? "PENDING"}
                  onValueChange={(v) =>
                    update.mutate({
                      subsidy_file_status: v,
                      subsidy_file_uploaded_date: v === "UPLOADED" ? todayISO() : null,
                      ...(v === "PRINTED"
                        ? { subsidy_file_printed: true, subsidy_file_printed_date: r?.subsidy_file_printed_date ?? todayISO() }
                        : {}),
                      ...(v === "UPLOADED" ? { subsidy_file_date: r?.subsidy_file_date ?? todayISO() } : {}),
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PRINTED">Printed</SelectItem>
                    <SelectItem value="UPLOADED">Uploaded</SelectItem>
                  </SelectContent>
                </Select>
              </Step>
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
                    number_plate_number: String(fd.get("number_plate_number") ?? "").toUpperCase().replace(/\s+/g, "") || null,
                    passing_date: String(fd.get("passing_date") ?? "") || null,
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
                <div><Label>Number plate</Label><Input name="number_plate_number" className="uppercase" placeholder="GJ03NK5189" defaultValue={rec.number_plate_number ?? ""} /></div>
                <div><Label>Passing done on</Label><Input name="passing_date" type="date" defaultValue={rec.passing_date ?? ""} /></div>
                <div><Label>Remarks</Label><Textarea name="remarks" rows={2} defaultValue={rec.remarks ?? ""} /></div>
                <Button disabled={update.isPending}>Save details</Button>
              </form>
              <div className="mt-4 space-y-1 border-t pt-3">
                <Field label="Outstanding">{inr(outstanding)}</Field>
                <Field label="Subsidy file date">{fmtDate(rec.subsidy_file_date)}</Field>
                <Field label="Use type">{subsidy?.use_type ?? "—"}</Field>
                <Field label="Application">{subsidy?.application_status ?? "—"}</Field>
                <Field label="Approval">{subsidy?.approval_status ?? "—"}</Field>
                <Field label="Number plate">{rec.number_plate_number ?? "—"}</Field>
                <Field label="Passing done on">{fmtDate(rec.passing_date ?? null)}</Field>
                <Field label="Number plate fitment">{fmtDate(r?.fitment_date ?? null)}</Field>
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
