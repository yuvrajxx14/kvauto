import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { StatusBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOOKING_STATUS_LABEL, PAYMENT_MODES, type BookingStatus, type PaymentMode, bookingPaymentState } from "@/lib/booking";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/bookings/$bookingId")({
  component: BookingDetail,
});

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(*),
          inquiry:inquiries(id, inquiry_number),
          salesman:profiles!bookings_salesman_id_fkey(id, full_name)
        `)
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ["booking-payments", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPayment = useMutation({
    mutationFn: async (payload: {
      amount: number;
      payment_date: string;
      payment_mode: PaymentMode;
      reference_number: string;
      remarks: string;
    }) => {
      const { data, error } = await supabase.rpc("receive_booking_payment_atomic", {
        _booking_id: bookingId,
        _amount: payload.amount,
        _payment_date: payload.payment_date,
        _payment_mode: payload.payment_mode,
        _reference_number: payload.reference_number || "",
        _remarks: payload.remarks || "",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment received");
      setPaymentOpen(false);
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      qc.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bookingQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const b = bookingQuery.data;
  if (!b) return <PageHeader title="Booking not found" />;

  const totalReceived = Number(b.amount_received ?? 0);
  const outstanding = Math.max(0, Number(b.final_price ?? 0) - totalReceived);

  return (
    <div>
      <PageHeader
        title={b.booking_number}
        subtitle={`${b.customer?.customer_name ?? "—"} · ${fmtDate(b.booking_date)}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/bookings"><ArrowLeft className="mr-1 h-4 w-4" /> All bookings</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Deal price" value={inr(b.final_price)} />
        <Metric label="Booking amount" value={inr(b.booking_amount)} />
        <Metric label="Total received" value={inr(totalReceived)} />
        <Metric label="Outstanding" value={inr(outstanding)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Field label="Name">
              <Link className="hover:underline" to="/customers/$customerId" params={{ customerId: b.customer_id }}>
                {b.customer?.customer_name ?? "—"}
              </Link>
            </Field>
            <Field label="Mobile">{b.customer?.mobile ?? "—"}</Field>
            <Field label="Village">{b.customer?.village ?? "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Booking</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Field label="Inquiry">
              <Link className="hover:underline" to="/inquiries/$inquiryId" params={{ inquiryId: b.inquiry_id }}>
                {b.inquiry?.inquiry_number ?? "—"}
              </Link>
            </Field>
            <Field label="Tractor">{b.tractor_model}</Field>
            <Field label="Variant">{b.variant ?? "—"}</Field>
            <Field label="Salesman">{b.salesman?.full_name ?? "—"}</Field>
            <Field label="Payment state">{bookingPaymentState(totalReceived, Number(b.booking_amount))}</Field>
            <Field label="Booking status">{BOOKING_STATUS_LABEL[b.status as BookingStatus]}</Field>
            <Field label="Stock/allocation status">{b.status === "BOOKED" ? "Awaiting Stock" : BOOKING_STATUS_LABEL[b.status as BookingStatus]}</Field>
            <Field label="Remarks">{b.remarks || "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Payment history</CardTitle>
            {outstanding > 0 && (
              <Button size="sm" onClick={() => setPaymentOpen((v) => !v)}>
                <CreditCard className="mr-1 h-4 w-4" /> Receive Payment
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentOpen && (
              <form
                className="rounded-md border p-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const amount = Number(fd.get("amount"));
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast.error("Enter a valid payment amount");
                    return;
                  }
                  if (amount > outstanding) {
                    toast.error("Payment cannot exceed outstanding balance");
                    return;
                  }
                  createPayment.mutate({
                    amount,
                    payment_date: String(fd.get("payment_date")),
                    payment_mode: String(fd.get("payment_mode")) as PaymentMode,
                    reference_number: String(fd.get("reference_number") || ""),
                    remarks: String(fd.get("remarks") || ""),
                  });
                }}
              >
                <div><Label>Amount</Label><Input name="amount" type="number" min="1" step="0.01" required /></div>
                <div><Label>Payment date</Label><Input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></div>
                <div>
                  <Label>Payment mode</Label>
                  <Select name="payment_mode" defaultValue="Cash">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m === "Bank" ? "Bank Transfer" : m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Reference / transaction number</Label><Input name="reference_number" /></div>
                <div><Label>Remarks</Label><Textarea name="remarks" /></div>
                <Button className="w-full" disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Saving…" : "Save Payment"}
                </Button>
              </form>
            )}

            {paymentsQuery.data?.length ? paymentsQuery.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">{inr(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(p.payment_date)} · {p.payment_mode}{p.reference_number ? ` · ${p.reference_number}` : ""}</p>
                </div>
                <span className="text-xs text-muted-foreground">{p.remarks || ""}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No payments received.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
