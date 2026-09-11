import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useImplementPayments,
  useImplementSale,
  IMPLEMENT_SALE_STATUS_LABEL,
  type ImplementSaleStatus,
} from "@/lib/implements";
import { PAYMENT_MODES, PAYMENT_MODE_LABEL } from "@/lib/booking";
import { usePerms } from "@/lib/permissions";
import { fmtDate, inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/implements/$saleId")({
  head: () => ({
    meta: [
      { title: "Implement Sale · KrushiVidhya Automobiles" },
      { name: "description", content: "Implement sale details, serial numbers, balance and payment history." },
      { property: "og:title", content: "Implement Sale · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Implement sale details and payment history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImplementSaleDetail,
});

function ImplementSaleDetail() {
  const { saleId } = Route.useParams();
  const perms = usePerms();
  const qc = useQueryClient();
  const { data: sale, isLoading } = useImplementSale(saleId);
  const { data: payments } = useImplementPayments(saleId);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<string>("Cash");

  const pay = useMutation({
    mutationFn: async (p: { amount: number; date: string; mode: string; reference: string; remarks: string }) => {
      const { error } = await supabase.rpc("receive_implement_payment_atomic", {
        _sale_id: saleId,
        _amount: p.amount,
        _payment_date: p.date,
        _payment_mode: p.mode,
        _reference_number: p.reference || null,
        _remarks: p.remarks || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!sale) return <PageHeader title="Implement sale not found" />;

  const items = (sale.items ?? []) as { id: string; item_name: string; serial_number: string | null; price: number }[];
  const balance = Number(sale.balance ?? 0);

  return (
    <div>
      <PageHeader
        title={sale.sale_number}
        subtitle={`${sale.customer?.customer_name ?? "—"} · ${fmtDate(sale.sale_date)}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/implements"><ArrowLeft className="mr-1 h-4 w-4" /> Implement sales</Link>
            </Button>
            {balance >= 1 && sale.status !== "CANCELLED" && perms.can("implements.sell") && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><IndianRupee className="mr-1 h-4 w-4" /> Receive payment</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Receive payment</DialogTitle></DialogHeader>
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const amount = Number(fd.get("amount"));
                      if (!Number.isFinite(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
                      pay.mutate({
                        amount,
                        date: String(fd.get("payment_date")),
                        mode,
                        reference: String(fd.get("reference_number") ?? ""),
                        remarks: String(fd.get("remarks") ?? ""),
                      });
                    }}
                  >
                    <div><Label>Amount (outstanding {inr(balance)})</Label><Input name="amount" type="number" min="1" step="0.01" defaultValue={String(balance)} required /></div>
                    <div>
                      <Label>Payment mode</Label>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Reference number</Label><Input name="reference_number" maxLength={60} /></div>
                    <div><Label>Payment date</Label><Input name="payment_date" type="date" defaultValue={todayISO()} required /></div>
                    <div><Label>Remarks</Label><Input name="remarks" maxLength={200} /></div>
                    <DialogFooter><Button disabled={pay.isPending}>{pay.isPending ? "Saving…" : "Receive"}</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Sale total" value={inr(sale.total_amount)} />
        <Metric label="Received" value={inr(sale.amount_received)} />
        <Metric label="Balance" value={inr(balance)} />
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-2">
              <Badge variant={sale.status === "PAID" ? "secondary" : "default"}>
                {IMPLEMENT_SALE_STATUS_LABEL[sale.status as ImplementSaleStatus] ?? sale.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Field label="Name">
              <Link className="hover:underline" to="/customers/$customerId" params={{ customerId: sale.customer_id }}>
                {sale.customer?.customer_name ?? "—"}
              </Link>
            </Field>
            <Field label="Mobile">{sale.customer?.mobile ?? "—"}</Field>
            <Field label="Village">{sale.customer?.village ?? "—"}</Field>
            <Field label="Ledger">
              <Link className="text-primary hover:underline" to="/accounting/$customerId" params={{ customerId: sale.customer_id }}>
                View customer ledger
              </Link>
            </Field>
            <Field label="Tractor booking">
              {sale.booking_id ? (
                <Link className="hover:underline" to="/bookings/$bookingId" params={{ bookingId: sale.booking_id }}>
                  {sale.booking?.booking_number ?? "Open booking"}
                </Link>
              ) : (
                "Implement only"
              )}
            </Field>
            <Field label="Remarks">{sale.remarks || "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Implements sold</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 && <p className="text-sm text-muted-foreground">No implements on this sale.</p>}
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">{i.item_name}</p>
                  <p className="text-xs text-muted-foreground">Serial {i.serial_number ?? "—"}</p>
                </div>
                <p>{inr(i.price)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(payments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payments received.</p>}
            {(payments ?? []).map((p) => (
              <div key={p.id} className="border-b pb-2 text-sm">
                <p className="font-medium">{inr(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(p.payment_date)} · {p.payment_mode}
                  {p.reference_number ? ` · ${p.reference_number}` : ""}
                </p>
              </div>
            ))}
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
