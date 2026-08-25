import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelSelect } from "@/components/sales/model-select";
import { useProfiles } from "@/lib/queries";
import { useServiceJobs } from "@/lib/service";
import { todayISO } from "@/lib/sales";
import { SPARE_PRIORITIES, SPARE_TYPE_LABEL, type SpareRequestType } from "@/lib/spares";

export const Route = createFileRoute("/_authenticated/spares/new")({
  head: () => ({
    meta: [
      { title: "New Spare Parts Requirement · KrushiVidhya Automobiles" },
      {
        name: "description",
        content: "Raise a spare parts requirement for a workshop job card or a walk-in customer.",
      },
      { property: "og:title", content: "New Spare Parts Requirement · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Record the parts a mechanic or customer needs from the spare counter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewSpareRequestPage,
});

type Line = { part_name: string; part_number: string; qty_requested: string; rate: string; remarks: string };

const emptyLine = (): Line => ({ part_name: "", part_number: "", qty_requested: "1", rate: "", remarks: "" });

function NewSpareRequestPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profiles } = useProfiles();
  const { data: jobs } = useServiceJobs({ status: "active" });

  const [type, setType] = useState<SpareRequestType>("MECHANIC");
  const [jobId, setJobId] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [mobile, setMobile] = useState("");
  const [model, setModel] = useState("");
  const [chassis, setChassis] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [neededBy, setNeededBy] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const pickJob = (id: string) => {
    setJobId(id);
    const job = (jobs ?? []).find((j) => j.id === id);
    if (job) {
      setModel(job.model ?? "");
      setChassis(job.chassis_number ?? "");
      if (job.assigned_to) setRequestedBy(job.assigned_to);
    }
  };

  const mechanicName = (profiles ?? []).find((p) => p.id === requestedBy)?.full_name ?? "";

  const create = useMutation({
    mutationFn: async () => {
      const validLines = lines.filter((l) => l.part_name.trim());
      if (validLines.length === 0) throw new Error("Add at least one part");
      const name = type === "MECHANIC" ? mechanicName : requesterName.trim();
      if (!name) throw new Error(type === "MECHANIC" ? "Select the mechanic" : "Enter the customer name");

      const { data, error } = await supabase
        .from("spare_requests")
        .insert({
          request_type: type,
          service_job_id: type === "MECHANIC" && jobId ? jobId : null,
          requester_name: name,
          mobile: mobile.trim() || null,
          model: model || null,
          chassis_number: chassis.trim() || null,
          priority,
          needed_by: neededBy || null,
          remarks: remarks.trim() || null,
          requested_by: type === "MECHANIC" && requestedBy ? requestedBy : null,
          created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemError } = await supabase.from("spare_request_items").insert(
        validLines.map((l, idx) => ({
          request_id: data.id,
          part_name: l.part_name.trim(),
          part_number: l.part_number.trim() || null,
          qty_requested: Number(l.qty_requested) || 1,
          rate: Number(l.rate) || 0,
          remarks: l.remarks.trim() || null,
          sort_order: idx,
        })),
      );
      if (itemError) throw itemError;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["spare-requests"] });
      toast.success("Spare parts requirement raised");
      navigate({ to: "/spares/$requestId", params: { requestId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New spare parts requirement" subtitle="Raise a demand for parts from the spare counter" />

      <div className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Who needs the parts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Requirement from</Label>
              <Select value={type} onValueChange={(v) => setType(v as SpareRequestType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPARE_TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "MECHANIC" ? (
              <>
                <div>
                  <Label>Job card (optional)</Label>
                  <Select value={jobId} onValueChange={pickJob}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Link a job card" />
                    </SelectTrigger>
                    <SelectContent>
                      {(jobs ?? []).map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.job_number} · {j.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mechanic</Label>
                  <Select value={requestedBy} onValueChange={setRequestedBy}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select mechanic" />
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
              </>
            ) : (
              <>
                <div>
                  <Label>Customer name</Label>
                  <Input
                    className="mt-1"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Customer at the counter"
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input className="mt-1" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <Label>Tractor model</Label>
              <div className="mt-1">
                <ModelSelect value={model} onChange={setModel} />
              </div>
            </div>
            <div>
              <Label>Chassis number</Label>
              <Input className="mt-1" value={chassis} onChange={(e) => setChassis(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPARE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Needed by</Label>
              <Input type="date" className="mt-1" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Parts required</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus className="mr-1 h-4 w-4" /> Add part
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <Label className="text-xs">Part name</Label>
                  <Input
                    className="mt-1"
                    value={l.part_name}
                    onChange={(e) => setLine(i, { part_name: e.target.value })}
                    placeholder="e.g. Engine oil filter"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Part number</Label>
                  <Input
                    className="mt-1"
                    value={l.part_number}
                    onChange={(e) => setLine(i, { part_number: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    value={l.qty_requested}
                    onChange={(e) => setLine(i, { qty_requested: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Rate (₹)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    value={l.rate}
                    onChange={(e) => setLine(i, { rate: e.target.value })}
                  />
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={lines.length === 1}
                    onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <Label>Remarks</Label>
            <Textarea className="mt-1" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-8">
          <Button variant="outline" onClick={() => navigate({ to: "/spares" })}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Raise requirement"}
          </Button>
        </div>
      </div>
    </div>
  );
}
