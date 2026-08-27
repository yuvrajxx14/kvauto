import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Printer, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { DocumentsPanel, documentProgress } from "@/components/sales/documents-panel";
import { PaymentDialog } from "@/components/sales/payment-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooking, useCustomerDocuments, useDocumentChecklist, useGatePass, usePassingRecord, useSubsidyCase } from "@/lib/erp";
import { usePerms } from "@/lib/permissions";
import { fmtDate, inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/delivery/$bookingId")({
  head: () => ({
    meta: [
      { title: "Complete delivery · KrushiVidhya Automobiles" },
      { name: "description", content: "Validate payment, PDI and documents before handing over the tractor." },
      { property: "og:title", content: "Complete delivery · KrushiVidhya Automobiles" },
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
  const perms = usePerms();
  const { data: b, isLoading } = useBooking(bookingId);
  const { data: checklist } = useDocumentChecklist();
  const { data: docs } = useCustomerDocuments(b?.customer_id ?? "");
  const { data: gatePass } = useGatePass(bookingId);
  const { data: passingRec } = usePassingRecord(bookingId);
  const { data: subsidy } = useSubsidyCase(bookingId);

  const [useType, setUseType] = useState("AGRICULTURE");
  const [applicationStatus, setApplicationStatus] = useState("PENDING");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");

  const issueGatePass = useMutation({
    mutationFn: async (payload: { issue_date: string; remarks: string }) => {
      const { data, error } = await supabase.rpc("issue_gate_pass", {
        _booking_id: bookingId,
        _issue_date: payload.issue_date,
        ...(payload.remarks ? { _remarks: payload.remarks } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Gate pass issued");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (payload: {
      delivery_date: string;
      remarks: string;
      use_type: string;
      application_status: string;
      approval_status: string;
      application_date: string | undefined;
      approval_date: string | undefined;
    }) => {
      const { data, error } = await supabase.rpc("complete_delivery_atomic", {
        _booking_id: bookingId,
        _delivery_date: payload.delivery_date,
        _remarks: payload.remarks,
        _use_type: payload.use_type,
        _application_status: payload.application_status,
        _approval_status: payload.approval_status,
        ...(payload.application_date ? { _application_date: payload.application_date } : {}),
        ...(payload.approval_date ? { _approval_date: payload.approval_date } : {}),
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <PageHeader title="Booking not found" />;

  const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
  const stock = alloc ? (Array.isArray(alloc.stock) ? alloc.stock[0] : alloc.stock) : null;
  const delivery = Array.isArray(b.delivery) ? b.delivery[0] : b.delivery;
  const isLoan = b.finance_type === "LOAN";
  const docCharge = isLoan && !b.doc_charge_posted ? Math.round(Number(b.loan_amount ?? 0) * 0.02) : 0;
  const totalDue = Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) + docCharge;
  const outstanding = Math.max(0, totalDue - Number(b.amount_received ?? 0));
  const progress = documentProgress(checklist ?? [], docs ?? []);
  const checks = [
    { label: "Tractor allocated", ok: !!alloc },
    { label: "PDI passed", ok: stock?.pdi_status === "PASSED" },
    { label: "NTIR inspection passed", ok: stock?.inspection_status === "PASSED" },
    {
      label: isLoan ? "Deal price + 2% loan document charge received" : "Full deal price received",
      ok: outstanding < 1,
    },
    { label: "Gate pass issued", ok: !!gatePass },
  ];
  const ready = checks.every((c) => c.ok);
  const docsPending = !progress.complete;
  const passingDone = !!passingRec?.passing_date;
  const subsidyDone =
    !!subsidy &&
    (subsidy.use_type === "COMMERCIAL" ||
      (subsidy.application_status === "DONE" && subsidy.approval_status === "APPROVED"));


  return (
    <div>
      <PageHeader
        title={`Delivery · ${b.booking_number}`}
        subtitle={`${b.customer?.customer_name ?? "—"} · ${b.tractor_model}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/delivery"><ArrowLeft className="mr-1 h-4 w-4" /> Delivery list</Link>
            </Button>
            {outstanding >= 1 && perms.can("payment.add") && (
              <PaymentDialog bookingId={bookingId} bookingNumber={b.booking_number} outstanding={outstanding} />
            )}
          </div>
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
            <Field label="Deal type">{isLoan ? `Loan · ${inr(b.loan_amount)}` : "Cash"}</Field>
            {docCharge > 0 && <Field label="Loan document charge (2%)">{inr(docCharge)}</Field>}
            <Field label="Total payable">{inr(totalDue)}</Field>
            <Field label="Outstanding">{inr(outstanding)}</Field>
            <Field label="Chassis">{alloc?.chassis_number ?? "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Handover</CardTitle></CardHeader>
          <CardContent>
            {delivery ? (
              <div className="space-y-2 text-sm">
                <Field label="Delivered on">{fmtDate(delivery.delivery_date)}</Field>
                <Field label="Use type">{delivery.use_type ?? "—"}</Field>
                <Field label="Remarks">{delivery.remarks || "—"}</Field>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {subsidyDone ? (
                    <Badge variant="secondary">Subsidy done</Badge>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/subsidy">Subsidy tracking</Link>
                    </Button>
                  )}
                  {passingDone ? (
                    <Badge variant="secondary">Passing done · {fmtDate(passingRec?.passing_date ?? null)}</Badge>
                  ) : (
                    <Button asChild size="sm">
                      <Link to="/passing/$bookingId" params={{ bookingId }}>Proceed to passing</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const appDate = String(fd.get("application_date") ?? "");
                  const apprDate = String(fd.get("approval_date") ?? "");
                  const agri = useType === "AGRICULTURE";
                  complete.mutate({
                    delivery_date: String(fd.get("delivery_date")),
                    remarks: String(fd.get("remarks") || ""),
                    use_type: useType,
                    application_status: agri ? applicationStatus : "NOT_APPLICABLE",
                    approval_status: agri && applicationStatus === "DONE" ? approvalStatus : "NOT_APPLICABLE",
                    application_date: agri && appDate ? appDate : undefined,
                    approval_date: agri && apprDate ? apprDate : undefined,
                  });
                }}
              >
                <div>
                  <Label>Use type</Label>
                  <Select value={useType} onValueChange={setUseType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGRICULTURE">Agriculture</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {useType === "AGRICULTURE" && (
                  <>
                    <div>
                      <Label>Online subsidy application</Label>
                      <Select value={applicationStatus} onValueChange={setApplicationStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DONE">Done</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {applicationStatus === "DONE" && (
                      <>
                        <div><Label>Application date</Label><Input name="application_date" type="date" /></div>
                        <div>
                          <Label>Government approval</Label>
                          <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="APPROVED">Approved</SelectItem>
                              <SelectItem value="PENDING">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {approvalStatus === "APPROVED" && (
                          <div><Label>Approval date</Label><Input name="approval_date" type="date" /></div>
                        )}
                      </>
                    )}
                    {(applicationStatus === "PENDING" || approvalStatus === "PENDING") && (
                      <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                        This customer will be tracked under{" "}
                        {applicationStatus === "PENDING" ? "“Application pending”" : "“Approval pending”"} in Subsidy tracking. A fresh
                        insurance charge may be required later.
                      </p>
                    )}
                  </>
                )}

                <div><Label>Delivery date</Label><Input name="delivery_date" type="date" defaultValue={todayISO()} required /></div>
                <div><Label>Remarks</Label><Textarea name="remarks" rows={3} /></div>
                {docsPending && (
                  <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs font-medium text-warning-foreground">
                    Warning: customer documents not fully collected — {progress.missingLabels.join(", ")}. You can still
                    deliver, but this customer will keep showing in the pending-documents reminder until collected.
                  </p>
                )}
                <Button
                  className="w-full"
                  disabled={!ready || complete.isPending}
                  onClick={(e) => {
                    if (
                      docsPending &&
                      !window.confirm(
                        `Documents pending: ${progress.missingLabels.join(", ")}.\n\nContinue with delivery and collect them later?`,
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  {complete.isPending
                    ? "Completing…"
                    : !ready
                      ? "Checklist incomplete"
                      : docsPending
                        ? "Complete Delivery (documents pending)"
                        : "Complete Delivery"}
                </Button>

              </form>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Gate pass
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gatePass ? (
              <div className="space-y-2 text-sm">
                <Field label="Gate pass no.">{gatePass.gatepass_number}</Field>
                <Field label="Issued on">{fmtDate(gatePass.issue_date)}</Field>
                <Field label="Chassis">{gatePass.chassis_number ?? "—"}</Field>
                <Field label="Remarks">{gatePass.remarks || "—"}</Field>
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/print/gatepass/$bookingId" params={{ bookingId }} target="_blank">
                      <Printer className="mr-1 h-4 w-4" /> Print gate pass
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/print/challan/$bookingId" params={{ bookingId }} target="_blank">
                      <Printer className="mr-1 h-4 w-4" /> Delivery challan
                    </Link>
                  </Button>
                </div>
              </div>
            ) : outstanding >= 1 ? (
              <p className="text-sm text-muted-foreground">
                Gate pass can be issued only after the full payment is received. Outstanding {inr(outstanding)}.
              </p>
            ) : !alloc ? (
              <p className="text-sm text-muted-foreground">Allocate a tractor before issuing the gate pass.</p>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  issueGatePass.mutate({
                    issue_date: String(fd.get("issue_date")),
                    remarks: String(fd.get("gp_remarks") || ""),
                  });
                }}
              >
                <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  Full payment received. Issue the gate pass — the delivery challan is generated from it.
                </p>
                <div><Label>Gate pass date</Label><Input name="issue_date" type="date" defaultValue={todayISO()} required /></div>
                <div><Label>Remarks</Label><Textarea name="gp_remarks" rows={2} /></div>
                <Button className="w-full" disabled={issueGatePass.isPending}>
                  {issueGatePass.isPending ? "Issuing…" : "Issue gate pass"}
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
