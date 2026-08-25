import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, Field } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/lib/auth";
import { useProfiles, useProfileMap } from "@/lib/queries";
import {
  useServiceJob,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  SERVICE_MODES,
  SERVICE_MODE_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  PROBLEM_CATEGORIES,
  type ServiceStatus,
  type ServiceMode,
  type Priority,
} from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/workshop/service/$jobId")({
  head: () => ({
    meta: [
      { title: "Service job card · KrushiVidhya Automobiles" },
      { name: "description", content: "Update tractor service work, parts, labour and job status." },
      { property: "og:title", content: "Service job card · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Workshop job card detail and billing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobDetailPage,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function JobDetailPage() {
  const { jobId } = useParams({ from: "/_authenticated/workshop/service/$jobId" });
  const { data: me } = useMe();
  const { data: job, isLoading } = useServiceJob(jobId);
  const { data: staff } = useProfiles();
  const names = useProfileMap();
  const qc = useQueryClient();

  const canEdit = !!(me?.isWorkshop || me?.isManagement);

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const status = String(form.get("status"));
      const patch: Record<string, unknown> = {
        status,
        priority: String(form.get("priority")),
        service_mode: String(form.get("service_mode")),
        problem_category: String(form.get("problem_category") ?? "") || null,
        assigned_to: String(form.get("assigned_to") ?? "") || null,
        promised_date: String(form.get("promised_date") ?? "") || null,
        work_done: String(form.get("work_done") ?? "").trim() || null,
        parts_details: String(form.get("parts_details") ?? "").trim() || null,
        parts_amount: Number(form.get("parts_amount") ?? 0),
        labour_amount: Number(form.get("labour_amount") ?? 0),
        remarks: String(form.get("remarks") ?? "").trim() || null,
      };
      if ((status === "COMPLETED" || status === "DELIVERED") && !job?.completed_date) {
        patch['completed_date'] = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("service_jobs").update(patch as never).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job card updated");
      qc.invalidateQueries({ queryKey: ["service-job", jobId] });
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading job card…</p>;
  if (!job) return <EmptyState title="Job card not found" hint="It may have been removed." />;

  return (
    <div>
      <PageHeader
        title={job.job_number}
        subtitle={`${job.customer_name} · ${job.village} · ${job.mobile}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/workshop/service">Back to register</Link>
            </Button>
            <Button asChild>
              <Link to="/print/job-card/$jobId" params={{ jobId: job.id }}>
                <Printer className="mr-1 h-4 w-4" /> Print job card
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Job details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {job.service_type === "PROBLEM" ? (
                <Badge variant="destructive">{job.problem_category ?? "Problem"}</Badge>
              ) : (
                <Badge variant="secondary">General service</Badge>
              )}
              <Badge variant="outline">{PRIORITY_LABEL[job.priority as Priority] ?? job.priority}</Badge>
              <Badge variant="outline">
                {SERVICE_MODE_LABEL[job.service_mode as ServiceMode] ?? job.service_mode}
              </Badge>
              <Badge>{SERVICE_STATUS_LABEL[job.status as ServiceStatus] ?? job.status}</Badge>
            </div>
            <Field label="Tractor">{job.model ?? "—"}</Field>
            <Field label="Registration / chassis">{job.registration_number ?? job.chassis_number ?? "—"}</Field>
            <Field label="Hours reading">{job.hours_reading ?? "—"}</Field>
            <Field label="Received">{job.received_date}</Field>
            <Field label="Promised">{job.promised_date ?? "—"}</Field>
            <Field label="Planned visit">{job.planned_visit_date ?? "—"}</Field>
            <Field label="Mechanic">{names.get(job.assigned_to ?? "") ?? "Unassigned"}</Field>
            <Field label="Complaint">{job.complaint ?? "—"}</Field>
            <Field label="Total billed">{inr(Number(job.total_amount || 0))}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Work &amp; billing</CardTitle>
          </CardHeader>
          <CardContent>
            {!canEdit ? (
              <EmptyState title="Read only" hint="Only workshop staff can update job cards." />
            ) : (
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate(new FormData(e.currentTarget));
                }}
              >
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={job.status}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{SERVICE_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue={job.priority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service mode</Label>
                  <Select name="service_mode" defaultValue={job.service_mode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_MODES.map((m) => (
                        <SelectItem key={m} value={m}>{SERVICE_MODE_LABEL[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {job.service_type === "PROBLEM" && (
                  <div>
                    <Label>Problem category</Label>
                    <Select name="problem_category" defaultValue={job.problem_category ?? PROBLEM_CATEGORIES[0]}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROBLEM_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Mechanic</Label>
                  <Select name="assigned_to" defaultValue={job.assigned_to ?? undefined}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      {(staff ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="promised_date">Promised date</Label>
                  <Input id="promised_date" name="promised_date" type="date" defaultValue={job.promised_date ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="work_done">Work done</Label>
                  <Textarea id="work_done" name="work_done" rows={3} defaultValue={job.work_done ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="parts_details">Parts used</Label>
                  <Textarea id="parts_details" name="parts_details" rows={2} defaultValue={job.parts_details ?? ""} />
                </div>
                <div>
                  <Label htmlFor="parts_amount">Parts amount (₹)</Label>
                  <Input
                    id="parts_amount"
                    name="parts_amount"
                    type="number"
                    step="1"
                    defaultValue={String(job.parts_amount ?? 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="labour_amount">Labour amount (₹)</Label>
                  <Input
                    id="labour_amount"
                    name="labour_amount"
                    type="number"
                    step="1"
                    defaultValue={String(job.labour_amount ?? 0)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea id="remarks" name="remarks" rows={2} defaultValue={job.remarks ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : "Save job card"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
