import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { SERVICE_MODES, SERVICE_PRIORITIES, SERVICE_TYPES, SERVICE_TYPE_LABEL } from "@/lib/service";

export type JobEditFields = {
  id: string;
  customer_name: string;
  mobile: string;
  village: string;
  model: string | null;
  registration_number: string | null;
  chassis_number: string | null;
  complaint: string | null;
  service_type: string;
  service_mode: string;
  priority: string;
  received_date: string;
  promised_date: string | null;
};

/** Management-only edit of the registered service entry details. */
export function JobEditDialog({ job, onSaved }: { job: JobEditFields; onSaved?: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(job.service_type);
  const [mode, setMode] = useState(job.service_mode);
  const [priority, setPriority] = useState(job.priority);

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from("service_jobs").update(values as never).eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service entry updated");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
      qc.invalidateQueries({ queryKey: ["service-job", job.id] });
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Edit service entry ${job.customer_name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit service entry</DialogTitle></DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const customerName = String(fd.get("customer_name") ?? "").trim();
            if (!customerName) { toast.error("Customer name is required"); return; }
            save.mutate({
              customer_name: customerName,
              mobile: String(fd.get("mobile") ?? "").trim(),
              village: String(fd.get("village") ?? "").trim(),
              model: String(fd.get("model") ?? "").trim() || null,
              registration_number: String(fd.get("registration_number") ?? "").trim() || null,
              chassis_number: String(fd.get("chassis_number") ?? "").trim() || null,
              complaint: String(fd.get("complaint") ?? "").trim() || null,
              service_type: type,
              service_mode: mode,
              priority,
              received_date: String(fd.get("received_date") ?? "") || undefined,
              promised_date: String(fd.get("promised_date") ?? "") || null,
            });
          }}
        >
          <div><Label>Customer</Label><Input name="customer_name" defaultValue={job.customer_name} required /></div>
          <div><Label>Mobile</Label><Input name="mobile" defaultValue={job.mobile} maxLength={15} /></div>
          <div><Label>Village</Label><Input name="village" defaultValue={job.village} maxLength={60} /></div>
          <div><Label>Model</Label><Input name="model" defaultValue={job.model ?? ""} maxLength={80} /></div>
          <div><Label>Registration no.</Label><Input name="registration_number" defaultValue={job.registration_number ?? ""} maxLength={20} /></div>
          <div><Label>Chassis no.</Label><Input name="chassis_number" defaultValue={job.chassis_number ?? ""} maxLength={30} /></div>
          <div>
            <Label>Service type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Service mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_MODES.map((m) => <SelectItem key={m} value={m}>{m === "IN_HOUSE" ? "In workshop" : "Field visit"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Received on</Label><Input name="received_date" type="date" defaultValue={job.received_date} /></div>
          <div><Label>Promised date</Label><Input name="promised_date" type="date" defaultValue={job.promised_date ?? ""} /></div>
          <div className="sm:col-span-2"><Label>Complaint</Label><Textarea name="complaint" rows={2} defaultValue={job.complaint ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
