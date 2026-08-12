import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInquiry, useProfileMap, useProfiles } from "@/lib/queries";
import { useMe } from "@/lib/auth";
import { PageHeader, Field, PipelineStepper } from "@/components/sales/ui";
import { StatusBadge, InterestBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EDITABLE_STATUSES,
  INTEREST_LEVELS,
  STATUS_LABEL,
  fmtDate,
  type InquiryStatus,
  type InterestLevel,
} from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/inquiries/$inquiryId")({
  head: () => ({
    meta: [
      { title: "Inquiry Detail — KrushiVidhya Automobiles" },
      { name: "description", content: "Customer details, tractor requirement, salesman and inquiry status." },
      { property: "og:title", content: "Inquiry Detail — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Tractor sales inquiry detail." },
    ],
  }),
  component: InquiryDetail,
});

type Customer = {
  id: string;
  customer_name: string;
  mobile: string;
  alternate_mobile: string | null;
  village: string;
  taluka: string | null;
  district: string | null;
  customer_type: string;
};

function InquiryDetail() {
  const { inquiryId } = Route.useParams();
  const { data: inquiry, isLoading } = useInquiry(inquiryId);
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const names = useProfileMap();
  const qc = useQueryClient();

  const [edit, setEdit] = useState(false);

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("inquiries").update(patch).eq("id", inquiryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inquiry updated");
      qc.invalidateQueries();
      setEdit(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!inquiry)
    return (
      <div>
        <PageHeader title="Inquiry not found" subtitle="It may have been removed or you have no access." />
        <Button asChild variant="outline">
          <Link to="/inquiries">Back to inquiries</Link>
        </Button>
      </div>
    );

  const c = inquiry.customer as unknown as Customer | null;
  const status = inquiry.status as InquiryStatus;
  const locked = status === "BOOKED" || status === "DELIVERED";

  return (
    <div>
      <PageHeader
        title={inquiry.inquiry_number}
        subtitle={`${c?.customer_name ?? "—"} · ${fmtDate(inquiry.inquiry_date)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/inquiries">
                <ArrowLeft className="mr-1 h-4 w-4" /> All inquiries
              </Link>
            </Button>
            {!locked && (
              <Button size="sm" onClick={() => setEdit((v) => !v)}>
                {edit ? "Cancel edit" : "Update inquiry"}
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4 shadow-card">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <StatusBadge status={status} />
          <InterestBadge level={inquiry.interest_level} />
          <PipelineStepper status={status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field label="Name">
              {c ? (
                <Link to="/customers/$customerId" params={{ customerId: c.id }} className="hover:underline">
                  {c.customer_name}
                </Link>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Mobile">{c?.mobile ?? "—"}</Field>
            <Field label="Alternate mobile">{c?.alternate_mobile ?? "—"}</Field>
            <Field label="Village">{c?.village ?? "—"}</Field>
            <Field label="Taluka">{c?.taluka ?? "—"}</Field>
            <Field label="Customer type">{c?.customer_type ?? "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tractor requirement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field label="Model">{inquiry.model}</Field>
            <Field label="HP">{inquiry.hp ?? "—"}</Field>
            <Field label="Variant">{inquiry.variant ?? "—"}</Field>
            <Field label="Lead source">{inquiry.source}</Field>
            <Field label="Salesman">{names.get(inquiry.salesman_id) ?? "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status &amp; follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            {!edit ? (
              <div className="space-y-2">
                <Field label="Status">{STATUS_LABEL[status]}</Field>
                <Field label="Interest level">{inquiry.interest_level}</Field>
                <Field label="Next follow-up">{fmtDate(inquiry.next_followup_date)}</Field>
                <Field label="Remarks">{inquiry.remarks || "—"}</Field>
                {locked && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    This inquiry is {STATUS_LABEL[status].toLowerCase()} and can no longer be edited here.
                  </p>
                )}
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const nextDate = String(fd.get("next_followup_date") || "");
                  const nextStatus = String(fd.get("status")) as InquiryStatus;
                  if (nextStatus !== "LOST" && !nextDate) {
                    toast.error("Next follow-up date is required for an active inquiry");
                    return;
                  }
                  update.mutate({
                    status: nextStatus,
                    interest_level: String(fd.get("interest_level")),
                    next_followup_date: nextDate || null,
                    remarks: String(fd.get("remarks") || "") || null,
                    salesman_id: String(fd.get("salesman_id") || inquiry.salesman_id),
                  });
                }}
              >
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITABLE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Interest level</Label>
                  <Select name="interest_level" defaultValue={inquiry.interest_level as InterestLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTEREST_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {me?.isManagement && (
                  <div className="space-y-1.5">
                    <Label>Salesman</Label>
                    <Select name="salesman_id" defaultValue={inquiry.salesman_id}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(profiles ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Next follow-up date</Label>
                  <Input type="date" name="next_followup_date" defaultValue={inquiry.next_followup_date ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Remarks</Label>
                  <Textarea name="remarks" defaultValue={inquiry.remarks ?? ""} maxLength={1000} />
                </div>
                <Button type="submit" className="w-full" disabled={update.isPending}>
                  {update.isPending ? "Saving…" : "Save changes"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
