import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { DeleteRecordButton } from "@/components/sales/delete-button";
import { Field, PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTechnicians } from "@/lib/queries";
import { fmtDate, inr } from "@/lib/sales";
import {
  SERVICE_NEXT,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  SERVICE_MODE_LABEL,
  SERVICE_TYPE_LABEL,
  seedServiceChecklist,
  useServiceChecklist,
  useServiceJob,
  type ServiceStatus,
} from "@/lib/service";
import { statusTone } from "./index";

export const Route = createFileRoute("/_authenticated/service/$jobId")({
  head: () => ({
    meta: [
      { title: "Service Job Card · KrushiVidhya Automobiles" },
      { name: "description", content: "Service job card with status workflow, technician assignment and workshop checklist." },
      { property: "og:title", content: "Service Job Card · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Track work done, parts and labour on a tractor service job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceJobPage,
});

function ServiceJobPage() {
  const { jobId } = useParams({ from: "/_authenticated/service/$jobId" });
  const qc = useQueryClient();
  const { data: job, isLoading } = useServiceJob(jobId);
  const { data: checklist } = useServiceChecklist(jobId);
  const { data: staff } = useTechnicians();

  const [work, setWork] = useState({ work_done: "", parts_details: "", parts_amount: "0", labour_amount: "0", remarks: "" });

  useEffect(() => {
    if (job) {
      setWork({
        work_done: job.work_done ?? "",
        parts_details: job.parts_details ?? "",
        parts_amount: String(job.parts_amount ?? 0),
        labour_amount: String(job.labour_amount ?? 0),
        remarks: job.remarks ?? "",
      });
    }
  }, [job]);

  useEffect(() => {
    if (job && checklist && checklist.length === 0) {
      seedServiceChecklist(jobId).then(() => qc.invalidateQueries({ queryKey: ["service-checklist", jobId] }));
    }
  }, [job, checklist, jobId, qc]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["service-job", jobId] });
    qc.invalidateQueries({ queryKey: ["service-jobs"] });
  };

  const patch = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from("service_jobs").update(values as never).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase.from("service_checklist").update({ is_done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-checklist", jobId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!job) return <p className="text-sm text-muted-foreground">Job card not found.</p>;

  const status = job.status as ServiceStatus;
  const nextStates = SERVICE_NEXT[status] ?? [];
  const items = checklist ?? [];
  const done = items.filter((i) => i.is_done).length;
  const total = Number(work.parts_amount || 0) + Number(work.labour_amount || 0);

  const moveTo = (next: ServiceStatus) => {
    if (next === "IN_PROGRESS" && !job.assigned_to) {
      toast.error("Assign a technician before starting work");
      return;
    }
    if (next === "COMPLETED" && done < items.length) {
      toast.error("Complete all checklist items before closing the job");
      return;
    }
    const values: Record<string, unknown> = { status: next };
    if (next === "COMPLETED") values['completed_date'] = new Date().toISOString().slice(0, 10);
    patch.mutate(values, { onSuccess: () => { refresh(); toast.success(`Moved to ${SERVICE_STATUS_LABEL[next]}`); } });
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/service"><ArrowLeft className="mr-1 h-4 w-4" /> Service jobs</Link>
      </Button>

      <PageHeader
        title={job.job_number}
        subtitle={`${job.customer_name} · ${job.mobile} · ${job.village}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={statusTone(status)}>
              {SERVICE_STATUS_LABEL[status] ?? status}
            </Badge>
            <DeleteRecordButton table="service_jobs" id={jobId} label="this service job" redirectTo="/service" />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Job status workflow</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {SERVICE_STATUSES.filter((s) => s !== "CANCELLED").map((s, i, arr) => {
                  const current = s === status;
                  const passed = arr.indexOf(status as never) > i;
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <span
                        className={
                          "rounded-md px-2.5 py-1 text-xs font-semibold " +
                          (current
                            ? "bg-primary text-primary-foreground"
                            : passed
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {SERVICE_STATUS_LABEL[s]}
                      </span>
                      {i < arr.length - 1 && <span className="text-muted-foreground/50">›</span>}
                    </div>
                  );
                })}
              </div>
              {nextStates.length === 0 ? (
                <p className="text-sm text-muted-foreground">This job is closed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nextStates.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "CANCELLED" ? "outline" : "default"}
                      onClick={() => moveTo(s)}
                      disabled={patch.isPending}
                    >
                      {SERVICE_STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">
                Service checklist <span className="text-sm font-normal text-muted-foreground">({done}/{items.length} done)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <label key={it.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <Checkbox
                    checked={it.is_done}
                    onCheckedChange={(v) => toggleItem.mutate({ id: it.id, is_done: !!v })}
                  />
                  <span className={it.is_done ? "text-muted-foreground line-through" : ""}>{it.label}</span>
                </label>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Preparing checklist…</p>}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Work done & billing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Work done</Label>
                <Textarea className="mt-1" rows={3} value={work.work_done} onChange={(e) => setWork({ ...work, work_done: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Parts used</Label>
                <Textarea className="mt-1" rows={2} value={work.parts_details} onChange={(e) => setWork({ ...work, parts_details: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Parts amount</Label>
                  <Input className="mt-1" type="number" value={work.parts_amount} onChange={(e) => setWork({ ...work, parts_amount: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Labour amount</Label>
                  <Input className="mt-1" type="number" value={work.labour_amount} onChange={(e) => setWork({ ...work, labour_amount: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Total</Label>
                  <p className="mt-3 text-sm font-semibold">{inr(total)}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</Label>
                <Textarea className="mt-1" rows={2} value={work.remarks} onChange={(e) => setWork({ ...work, remarks: e.target.value })} />
              </div>
              <Button
                onClick={() =>
                  patch.mutate(
                    {
                      work_done: work.work_done || null,
                      parts_details: work.parts_details || null,
                      parts_amount: Number(work.parts_amount || 0),
                      labour_amount: Number(work.labour_amount || 0),
                      remarks: work.remarks || null,
                    },
                    { onSuccess: () => { refresh(); toast.success("Job card saved"); } },
                  )
                }
                disabled={patch.isPending}
              >
                Save job card
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Technician</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={job.assigned_to ?? "none"}
                onValueChange={(v) =>
                  patch.mutate(
                    {
                      assigned_to: v === "none" ? null : v,
                      ...(v !== "none" && job.status === "OPEN" ? { status: "ASSIGNED" } : {}),
                    },
                    { onSuccess: () => { refresh(); toast.success("Technician updated"); } },
                  )
                }
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(staff ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Currently assigned: {job.technician?.full_name ?? "Nobody"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Job details</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Tractor">{job.model ?? "—"}</Field>
              <Field label="Registration">{job.registration_number ?? "—"}</Field>
              <Field label="Chassis">{job.chassis_number ?? "—"}</Field>
              <Field label="Hours">{job.hours_reading ?? "—"}</Field>
              <Field label="Service type">{SERVICE_TYPE_LABEL[job.service_type] ?? job.service_type}</Field>
              <Field label="Mode">{SERVICE_MODE_LABEL[job.service_mode] ?? job.service_mode}</Field>
              <Field label="Priority">{job.priority}</Field>
              <Field label="Problem area">{job.problem_category ?? "—"}</Field>
              <Field label="Received">{fmtDate(job.received_date)}</Field>
              <Field label="Promised">{job.promised_date ? fmtDate(job.promised_date) : "—"}</Field>
              <Field label="Completed">{job.completed_date ? fmtDate(job.completed_date) : "—"}</Field>
              <Field label="Complaint">{job.complaint ?? "—"}</Field>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
