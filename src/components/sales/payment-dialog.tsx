import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CreditCard, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES, PAYMENT_MODE_LABEL, PAYMENT_TYPES, PAYMENT_TYPE_LABEL } from "@/lib/booking";
import { inr, todayISO } from "@/lib/sales";

/** Reusable "receive payment" dialog — usable from Booking, Delivery and Accounting. */
export function PaymentDialog({
  bookingId,
  bookingNumber,
  outstanding,
  trigger,
  defaultType = "BALANCE",
}: {
  bookingId: string;
  bookingNumber?: string | undefined;
  outstanding: number;
  trigger?: React.ReactNode;
  defaultType?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (p: {
      amount: number;
      payment_date: string;
      payment_mode: string;
      payment_type: string;
      reference_number: string;
      remarks: string;
    }) => {
      const { data, error } = await supabase.rpc("receive_booking_payment_atomic", {
        _booking_id: bookingId,
        _amount: p.amount,
        _payment_date: p.payment_date,
        _payment_mode: p.payment_mode,
        _payment_type: p.payment_type,
        _reference_number: p.reference_number,
        _remarks: p.remarks,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      setLastPaymentId(id);
      toast.success("Payment received");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLastPaymentId(null);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <CreditCard className="mr-1 h-4 w-4" /> Receive payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive payment</DialogTitle>
          <DialogDescription>
            {bookingNumber ? `${bookingNumber} · ` : ""}Outstanding {inr(outstanding)}
          </DialogDescription>
        </DialogHeader>

        {lastPaymentId ? (
          <div className="space-y-4">
            <p className="text-sm">Receipt saved successfully.</p>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to="/print/receipt/$paymentId" params={{ paymentId: lastPaymentId }} target="_blank">
                  <Printer className="mr-1 h-4 w-4" /> Print receipt
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const amount = Number(fd.get("amount"));
              if (!Number.isFinite(amount) || amount <= 0) {
                toast.error("Enter a valid amount");
                return;
              }
              create.mutate({
                amount,
                payment_date: String(fd.get("payment_date")),
                payment_mode: String(fd.get("payment_mode")),
                payment_type: String(fd.get("payment_type")),
                reference_number: String(fd.get("reference_number") ?? ""),
                remarks: String(fd.get("remarks") ?? ""),
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Amount</Label>
                <Input name="amount" type="number" min="1" step="0.01" defaultValue={outstanding > 0 ? String(Math.round(outstanding)) : ""} required />
              </div>
              <div>
                <Label>Date</Label>
                <Input name="payment_date" type="date" defaultValue={todayISO()} required />
              </div>
              <div>
                <Label>Mode</Label>
                <Select name="payment_mode" defaultValue="Cash">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Receipt type</Label>
                <Select name="payment_type" defaultValue={defaultType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.filter((t) => t !== "REFUND").map((t) => (
                      <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reference number</Label>
              <Input name="reference_number" maxLength={60} placeholder="Cheque / UPI / NEFT reference" />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea name="remarks" rows={2} maxLength={500} />
            </div>
            <DialogFooter>
              <Button disabled={create.isPending}>{create.isPending ? "Saving…" : "Save receipt"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
