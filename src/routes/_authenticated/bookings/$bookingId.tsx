import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Truck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { BookingBadge, StockBadge } from "@/components/sales/badges";
import { DocumentsPanel } from "@/components/sales/documents-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBooking, useBookingPayments, useStock } from "@/lib/erp";
import {
  BOOKING_STATUS_LABEL,
  PAYMENT_MODES,
  PAYMENT_MODE_LABEL,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABEL,
  bookingPaymentState,
  type BookingStatus,
  type PaymentMode,
} from "@/lib/booking";
import type { StockStatus } from "@/lib/stock";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking detail · KrushiVidhya Automobiles" },
      { name: "description", content: "Booking payments, tractor allocation, documents and delivery readiness." },
      { property: "og:title", content: "Booking detail · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Booking payments, allocation and delivery readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false);

  const bookingQuery = useBooking(bookingId);
  const paymentsQuery = useBookingPayments(bookingId);
  const b = bookingQuery.data;
  const availableStock = useStock({ status: "AVAILABLE", model: b?.tractor_model });

  const createPayment = useMutation({
    mutationFn: async (payload: {
      amount: number;
      payment_date: string;
      payment_mode: PaymentMode;
      payment_type: string;
      reference_number: string;
      remarks: string;
    }) => {
      const { data, error } = await supabase.rpc("receive_booking_payment_atomic", {
        _booking_id: bookingId,
        _amount: payload.amount,
        _payment_date: payload.payment_date,
        _payment_mode: payload.payment_mode,
        _payment_type: payload.payment_type,
        _reference_number: payload.reference_number || "",
        _remarks: payload.remarks || "",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment received");
      setPaymentOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allocate = useMutation({
    mutationFn: async (stockId: string) => {
      const { data, error } = await supabase.rpc("allocate_tractor_atomic", {
        _booking_id: bookingId,
        _tractor_stock_id: stockId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tractor allocated");
      setAllocOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bookingQuery.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!b) return <PageHeader title="Booking not found" />;

  const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
  const delivery = Array.isArray(b.delivery) ? b.delivery[0] : b.delivery;
  const totalReceived = Number(b.amount_received ?? 0);
  const outstanding = Math.max(0, Number(b.final_price ?? 0) - totalReceived);
  const status = b.status as BookingStatus;

  return (
    <div>
      <PageHeader
        title={b.booking_number}
        subtitle={`${b.customer?.customer_name ?? "—"} · ${fmtDate(b.booking_date)}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/bookings"><ArrowLeft className="mr-1 h-4 w-4" /> All bookings</Link>
            </Button>
            {status !== "DELIVERED" && alloc && (
              <Button size="sm" onClick={() => navigate({ to: "/delivery/$bookingId", params: { bookingId } })}>
                <Truck className="mr-1 h-4 w-4" /> Delivery
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        <Metric label="Deal price" value={inr(b.final_price)} />
        <Metric label="Booking amount" value={inr(b.booking_amount)} />
        <Metric label="Total received" value={inr(totalReceived)} />
        <Metric label="Outstanding" value={inr(outstanding)} />
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-2"><BookingBadge status={status} /></div>
          </CardContent>
        </Card>
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
            <Field label="Ledger">
              <Link className="text-primary hover:underline" to="/accounting/$customerId" params={{ customerId: b.customer_id }}>
                View customer ledger
              </Link>
            </Field>
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
            <Field label="Booking amount state">{bookingPaymentState(totalReceived, Number(b.booking_amount))}</Field>
            <Field label="Booking status">{BOOKING_STATUS_LABEL[status]}</Field>
            <Field label="Expected delivery">{fmtDate(b.expected_delivery_date)}</Field>
            <Field label="Remarks">{b.remarks || "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Tractor allocation</CardTitle>
            {!alloc && status !== "CANCELLED" && (
              <Button size="sm" variant="secondary" onClick={() => setAllocOpen((v) => !v)}>
                <Wrench className="mr-1 h-4 w-4" /> Allocate
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {alloc ? (
              <>
                <Field label="Chassis">{alloc.chassis_number}</Field>
                <Field label="Engine">{alloc.engine_number}</Field>
                <Field label="Model">{alloc.model ?? b.tractor_model}</Field>
                <Field label="Allocated on">{fmtDate(alloc.allocated_date)}</Field>
                {alloc.stock && (
                  <div className="flex items-center gap-2 pt-1">
                    <StockBadge status={alloc.stock.status as StockStatus} />
                    <Link
                      className="text-xs text-primary hover:underline"
                      to="/stock/$stockId"
                      params={{ stockId: alloc.tractor_stock_id }}
                    >
                      Open stock unit
                    </Link>
                  </div>
                )}
              </>
            ) : allocOpen ? (
              <div className="space-y-2">
                {availableStock.data?.length ? (
                  availableStock.data.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div>
                        <p className="font-medium">{s.chassis_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.model} · {s.variant ?? "—"} · {s.colour ?? "—"} · {s.location}
                        </p>
                      </div>
                      <Button size="sm" disabled={allocate.isPending} onClick={() => allocate.mutate(s.id)}>
                        Allocate
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No available stock for {b.tractor_model}. Raise an order from the Stock module.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tractor allocated yet.</p>
            )}
            {delivery && (
              <p className="pt-2 text-xs text-success">Delivered on {fmtDate(delivery.delivery_date)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                className="space-y-3 rounded-md border p-3"
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
                    payment_type: String(fd.get("payment_type")),
                    reference_number: String(fd.get("reference_number") || ""),
                    remarks: String(fd.get("remarks") || ""),
                  });
                }}
              >
                <div><Label>Amount</Label><Input name="amount" type="number" min="1" step="0.01" required /></div>
                <div>
                  <Label>Payment type</Label>
                  <Select name="payment_type" defaultValue={totalReceived > 0 ? "BALANCE" : "BOOKING"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.filter((t) => t !== "REFUND").map((t) => (
                        <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment date</Label>
                  <Input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div>
                  <Label>Payment mode</Label>
                  <Select name="payment_mode" defaultValue="Cash">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Reference / transaction number</Label><Input name="reference_number" /></div>
                <div><Label>Remarks</Label><Textarea name="remarks" /></div>
                <Button className="w-full" disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Saving…" : "Save Payment"}
                </Button>
              </form>
            )}

            {paymentsQuery.data?.length ? (
              paymentsQuery.data.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">{inr(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.payment_date)} · {PAYMENT_TYPE_LABEL[p.payment_type as keyof typeof PAYMENT_TYPE_LABEL] ?? p.payment_type} ·{" "}
                      {p.payment_mode}
                      {p.reference_number ? ` · ${p.reference_number}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.remarks || ""}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No payments received.</p>
            )}
          </CardContent>
        </Card>

        <DocumentsPanel customerId={b.customer_id} />
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
