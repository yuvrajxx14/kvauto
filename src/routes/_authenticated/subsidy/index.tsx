import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubsidyCases, usePassingRecords } from "@/lib/erp";
import { InsuranceChargeDialog } from "@/components/sales/insurance-dialog";
import { fmtDate, inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/subsidy/")({
  head: () => ({
    meta: [
      { title: "Subsidy tracking · KrushiVidhya Automobiles" },
      { name: "description", content: "Track online subsidy applications, government approvals and insurance charges after delivery." },
      { property: "og:title", content: "Subsidy tracking · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Application and approval status for delivered tractors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubsidyPage,
});

function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function SubsidyPage() {
  const { data: cases, isLoading } = useSubsidyCases();
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: async (p: { id: string; patch: Record<string, string | null> }) => {
      const { error } = await supabase.from("subsidy_cases").update(p.patch as never).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subsidy status updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = cases ?? [];
  const withStage = all.map((r) => {
    const p = passingByBooking.get(r.booking_id);
    const b = r.booking;
    const outstanding = b
      ? Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0)
      : 0;
    const paid = outstanding < 1;
    const passingDone = !!p?.rto_number || !!p?.number_plate_received;
    const fileDone = p?.subsidy_file_status === "UPLOADED";
    let stage: StageKey = "APPLICATION";
    if (r.application_status === "DONE") stage = "APPROVAL";
    if (r.application_status === "DONE" && r.approval_status === "APPROVED") stage = "PAYMENT";
    if (stage === "PAYMENT" && paid) stage = "PASSING";
    if (stage === "PASSING" && passingDone) stage = "FILE_CHECK";
    if (stage === "FILE_CHECK" && fileDone) stage = "DONE";
    return { ...r, stage, paid, outstanding: Math.max(0, outstanding), passingDone, fileDone };
  });

  const count = (s: StageKey) => withStage.filter((r) => r.stage === s).length;
  const rows = stage === "ALL" ? withStage : withStage.filter((r) => r.stage === stage);

  return (
    <div>
      <PageHeader title="Subsidy tracking" subtitle="Delivered customers moving through application → approval → payment → passing → file check" />

      <div className="mb-4 flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={stage === s.key ? "default" : "outline"}
            onClick={() => setStage(s.key)}
          >
            {s.label}
            <span className="ml-2 text-xs opacity-70">
              {s.key === "ALL" ? withStage.length : count(s.key)}
            </span>
          </Button>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Delivered customers</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Use</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead className="text-right">Insurance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No delivered bookings yet.</TableCell></TableRow>
              )}
              {rows.map((r) => {
                const lateApproval =
                  r.use_type === "AGRICULTURE" &&
                  (r.application_status !== "DONE" ||
                    daysBetween(r.delivery_date, r.approval_date ?? todayISO()) > 7);
                const booking = r.booking;
                const outstanding = booking
                  ? Math.max(0, Number(booking.final_price ?? 0) + Number(booking.extra_charges ?? 0) - Number(booking.amount_received ?? 0))
                  : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to="/accounting/$customerId" params={{ customerId: r.customer_id }} className="hover:underline">
                        {r.customer?.customer_name ?? "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.customer?.village ?? ""}</p>
                    </TableCell>
                    <TableCell>
                      <Link to="/bookings/$bookingId" params={{ bookingId: r.booking_id }} className="text-xs hover:underline">
                        {booking?.booking_number ?? "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{booking?.tractor_model ?? ""}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.use_type === "AGRICULTURE" ? "Agriculture" : "Commercial"}</Badge></TableCell>
                    <TableCell>
                      {r.use_type === "AGRICULTURE" ? (
                        <Select
                          value={r.application_status}
                          onValueChange={(v) =>
                            update.mutate({ id: r.id, patch: { application_status: v, application_date: v === "DONE" ? (r.application_date ?? todayISO()) : null } })
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="DONE">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.use_type === "AGRICULTURE" && r.application_status === "DONE" ? (
                        <Select
                          value={r.approval_status}
                          onValueChange={(v) =>
                            update.mutate({ id: r.id, patch: { approval_status: v, approval_date: v === "APPROVED" ? (r.approval_date ?? todayISO()) : null } })
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(r.delivery_date)}</TableCell>
                    <TableCell className="text-right">
                      {r.insurance_charged ? (
                        <span className="text-xs text-muted-foreground">{inr(r.insurance_amount)} charged</span>
                      ) : lateApproval ? (
                        <InsuranceChargeDialog caseId={r.id} bookingId={r.booking_id} model={booking?.tractor_model ?? ""} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Not required</span>
                      )}
                      {outstanding > 0 && <p className="text-xs text-destructive">Due {inr(outstanding)}</p>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
