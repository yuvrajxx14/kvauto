import { useState } from "react";
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
import { SPARE_PRIORITIES, SPARE_REQUEST_TYPES, SPARE_TYPE_LABEL } from "@/lib/spares";

export type SpareRequestEditFields = {
  id: string;
  request_type: string;
  requester_name: string;
  mobile: string;
  model: string | null;
  chassis_number: string | null;
  priority: string;
  needed_by: string | null;
  remarks: string | null;
};

/** Management-only edit of a spare parts requirement's header details. */
export function SpareRequestEditDialog({ request }: { request: SpareRequestEditFields }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(request.request_type);
  const [priority, setPriority] = useState(request.priority);

  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from("spare_requests").update(values as never).eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Requirement updated");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["spare-requests"] });
      qc.invalidateQueries({ queryKey: ["spare-request", request.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Edit requirement ${request.requester_name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit spare requirement</DialogTitle></DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const requester = String(fd.get("requester_name") ?? "").trim();
            if (!requester) { toast.error("Requester name is required"); return; }
            save.mutate({
              request_type: type,
              requester_name: requester,
              mobile: String(fd.get("mobile") ?? "").trim(),
              model: String(fd.get("model") ?? "").trim() || null,
              chassis_number: String(fd.get("chassis_number") ?? "").trim() || null,
              priority,
              needed_by: String(fd.get("needed_by") ?? "") || null,
              remarks: String(fd.get("remarks") ?? "").trim() || null,
            });
          }}
        >
          <div>
            <Label>Raised for</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SPARE_REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{SPARE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SPARE_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Requester</Label><Input name="requester_name" defaultValue={request.requester_name} required /></div>
          <div><Label>Mobile</Label><Input name="mobile" defaultValue={request.mobile} maxLength={15} /></div>
          <div><Label>Model</Label><Input name="model" defaultValue={request.model ?? ""} maxLength={80} /></div>
          <div><Label>Chassis no.</Label><Input name="chassis_number" defaultValue={request.chassis_number ?? ""} maxLength={30} /></div>
          <div><Label>Needed by</Label><Input name="needed_by" type="date" defaultValue={request.needed_by ?? ""} /></div>
          <div className="sm:col-span-2"><Label>Remarks</Label><Textarea name="remarks" rows={2} defaultValue={request.remarks ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
