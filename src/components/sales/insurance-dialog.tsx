import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/** Adds a fresh insurance charge to the customer's balance after a late subsidy approval. */
export function InsuranceChargeDialog({
  caseId,
  bookingId,
  model,
}: {
  caseId: string;
  bookingId: string;
  model: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const charge = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.rpc("post_extra_charge_atomic", {
        _booking_id: bookingId,
        _amount: amount,
        _kind: "INSURANCE",
        _remarks: `New insurance for ${model}`,
      });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("subsidy_cases")
        .update({ insurance_required: true, insurance_amount: amount, insurance_charged: true })
        .eq("id", caseId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Insurance amount added to the customer balance");
      setOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary"><ShieldPlus className="mr-1 h-4 w-4" /> Add insurance</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new insurance charge</DialogTitle>
          <DialogDescription>
            Approval came late (or no application was filed) for {model}. Add the fresh insurance amount — it is posted to the customer
            ledger and added to the outstanding balance.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const amount = Number(new FormData(e.currentTarget).get("amount"));
            if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
            charge.mutate(amount);
          }}
        >
          <div><Label>Insurance amount</Label><Input name="amount" type="number" min="1" step="0.01" required /></div>
          <DialogFooter>
            <Button disabled={charge.isPending}>{charge.isPending ? "Saving…" : "Add to balance"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
