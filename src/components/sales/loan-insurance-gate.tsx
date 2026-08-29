import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentDialog } from "@/components/sales/payment-dialog";
import { inr } from "@/lib/sales";
import { usePerms } from "@/lib/permissions";

type GateBooking = {
  id: string;
  booking_number: string;
  finance_type: string;
  insurance_charged: boolean;
  insurance_amount: number;
  outstanding: number;
};

/**
 * Mandatory gate before Passing for LOAN deals:
 * 1. Insurance amount must be entered (posted to the customer balance).
 * 2. The full outstanding (including insurance) must be received.
 * Only then is the "Open passing" link enabled.
 */
export function LoanInsuranceGate({
  booking,
  trigger,
}: {
  booking: GateBooking;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const perms = usePerms();
  const [open, setOpen] = useState(false);

  const charge = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.rpc("charge_loan_insurance_atomic", {
        _booking_id: booking.id,
        _amount: amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insurance amount added to the customer balance");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cleared = booking.insurance_charged && booking.outstanding < 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <ShieldPlus className="mr-1 h-4 w-4" /> Proceed to passing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Loan deal — insurance & payment required</DialogTitle>
          <DialogDescription>
            {booking.booking_number}: before passing, enter the insurance amount (it is added to the customer
            balance) and receive the full outstanding payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 — insurance */}
          <div className="rounded-md border p-3">
            <p className="text-sm font-semibold">1. Insurance charge</p>
            {booking.insurance_charged ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Insurance of {inr(booking.insurance_amount)} already added to the balance.
              </p>
            ) : (
              <form
                className="mt-2 flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(new FormData(e.currentTarget).get("amount"));
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast.error("Enter a valid insurance amount");
                    return;
                  }
                  charge.mutate(amount);
                }}
              >
                <div className="flex-1">
                  <Label>Insurance amount</Label>
                  <Input name="amount" type="number" min="1" step="0.01" required autoFocus />
                </div>
                <Button disabled={charge.isPending}>{charge.isPending ? "Adding…" : "Add to balance"}</Button>
              </form>
            )}
          </div>

          {/* Step 2 — payment */}
          <div className="rounded-md border p-3">
            <p className="text-sm font-semibold">2. Receive full payment</p>
            {booking.outstanding < 1 ? (
              <p className="mt-1 text-sm text-muted-foreground">Full payment received. Outstanding ₹0.</p>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  Outstanding after insurance: <span className="font-semibold">{inr(booking.outstanding)}</span>
                </p>
                {booking.insurance_charged &&
                  (perms.can("payment.add") ? (
                    <PaymentDialog
                      bookingId={booking.id}
                      bookingNumber={booking.booking_number}
                      outstanding={booking.outstanding}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ask the accountant / management to receive the payment.
                    </p>
                  ))}
                {!booking.insurance_charged && (
                  <p className="text-xs text-muted-foreground">Add the insurance charge first.</p>
                )}
              </div>
            )}
          </div>

          {cleared ? (
            <Button asChild className="w-full">
              <Link to="/passing/$bookingId" params={{ bookingId: booking.id }}>
                Open passing <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Open passing (insurance & payment pending)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** True when a booking is blocked from passing because of the loan insurance/payment rule. */
export function passingBlocked(b: {
  finance_type: string;
  insurance_charged?: boolean | null;
  outstanding: number;
}) {
  return b.finance_type === "LOAN" && (!b.insurance_charged || b.outstanding >= 1);
}
