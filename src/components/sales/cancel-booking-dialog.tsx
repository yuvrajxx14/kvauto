import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES, PAYMENT_MODE_LABEL } from "@/lib/booking";
import { inr } from "@/lib/sales";

export function CancelBookingDialog({
  bookingId,
  received,
}: {
  bookingId: string;
  received: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const cancel = useMutation({
    mutationFn: async (p: { reason: string; refund_amount: number; refund_mode: string; remarks: string }) => {
      const { error } = await supabase.rpc("cancel_booking_atomic", {
        _booking_id: bookingId,
        _reason: p.reason,
        _refund_amount: p.refund_amount,
        _refund_mode: p.refund_mode,
        _remarks: p.remarks,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      setOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive"><XCircle className="mr-1 h-4 w-4" /> Cancel booking</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            Releases any allocated tractor back to stock and records the refund. Amount collected so far: {inr(received)}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const reason = String(fd.get("reason") ?? "").trim();
            if (!reason) { toast.error("Cancellation reason is required"); return; }
            const refund = Number(fd.get("refund_amount") ?? 0) || 0;
            if (refund > received) { toast.error("Refund cannot exceed the amount received"); return; }
            cancel.mutate({
              reason,
              refund_amount: refund,
              refund_mode: String(fd.get("refund_mode") ?? "Cash"),
              remarks: String(fd.get("remarks") ?? ""),
            });
          }}
        >
          <div><Label>Reason</Label><Input name="reason" maxLength={200} required /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Refund amount</Label><Input name="refund_amount" type="number" min="0" step="0.01" defaultValue={String(Math.round(received))} /></div>
            <div>
              <Label>Refund mode</Label>
              <Select name="refund_mode" defaultValue="Cash">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Remarks</Label><Textarea name="remarks" rows={2} maxLength={500} /></div>
          <DialogFooter>
            <Button variant="destructive" disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
