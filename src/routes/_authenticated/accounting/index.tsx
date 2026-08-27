import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sales/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllPayments, useBookings } from "@/lib/erp";
import { PaymentDialog } from "@/components/sales/payment-dialog";
import { fmtDate, inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/accounting/")({
  head: () => ({
    meta: [
      { title: "Accounting \u00b7 KrushiVidhya Automobiles" },
      { name: "description", content: "Collections, outstanding balances and receipts across all tractor bookings." },
      { property: "og:title", content: "Accounting \u00b7 KrushiVidhya Automobiles" },
      { property: "og:description", content: "Collections and outstanding balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountingPage,
});

function AccountingPage() {
  const { data: bookings } = useBookings();
  const { data: payments } = useAllPayments();

  const open = (bookings ?? []).filter((b) => b.status !== "CANCELLED");
  const today = todayISO();
  const todayCollection = (payments ?? []).filter((p) => p.payment_date === today).reduce((s, p) => s + Number(p.amount), 0);

  const outstandingRows = open
    .map((b) => ({ b, out: Math.max(0, Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0)) }))
    .filter((r) => r.out > 1)
    .sort((a, x) => x.out - a.out);

  const totalOutstanding = outstandingRows.reduce((s, r) => s + r.out, 0);
  const pendingBeforeDelivery = outstandingRows.filter((r) => r.b.status !== "DELIVERED").length;
  const deliveredWithDues = outstandingRows.filter((r) => r.b.status === "DELIVERED").length;

  return (
    <div>
      <PageHeader title="Accounting" subtitle="Collections, outstanding balances and customer ledgers" />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Total outstanding" value={inr(totalOutstanding)} />
        <Metric label="Accounts to recover" value={String(outstandingRows.length)} />
        <Metric label="Payment pending before delivery" value={String(pendingBeforeDelivery)} />
        <Metric label="Delivered but dues left" value={String(deliveredWithDues)} />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Collected today: {inr(todayCollection)}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Outstanding balances</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingRows.length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No outstanding balances.</TableCell></TableRow>}
                {outstandingRows.map(({ b, out }) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link to="/accounting/$customerId" params={{ customerId: b.customer_id }} className="hover:underline">
                        {b.customer?.customer_name ?? "\u2014"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to="/bookings/$bookingId" params={{ bookingId: b.id }} className="text-xs hover:underline">{b.booking_number}</Link>
                    </TableCell>
                    <TableCell className="text-right font-medium">{inr(out)}</TableCell>
                    <TableCell className="text-right">
                      <PaymentDialog bookingId={b.id} bookingNumber={b.booking_number} outstanding={out} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent receipts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Print</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No receipts yet.</TableCell></TableRow>}
                {(payments ?? []).slice(0, 20).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{fmtDate(p.payment_date)}</TableCell>
                    <TableCell>{p.booking?.customer?.customer_name ?? "\u2014"}</TableCell>
                    <TableCell className="text-xs">{p.payment_mode}</TableCell>
                    <TableCell className="text-right">{inr(p.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Link to="/print/receipt/$paymentId" params={{ paymentId: p.id }} target="_blank" className="text-xs text-primary hover:underline">
                        Receipt
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
