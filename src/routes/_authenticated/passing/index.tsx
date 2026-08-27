import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBookings, usePassingRecords } from "@/lib/erp";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/passing/")({
  head: () => ({
    meta: [
      { title: "Passing · KrushiVidhya Automobiles" },
      { name: "description", content: "RTO passing, insurance and subsidy file progress for delivered tractors." },
      { property: "og:title", content: "Passing · KrushiVidhya Automobiles" },
      { property: "og:description", content: "RTO passing and subsidy file progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PassingList,
});

function PassingList() {
  const { data: bookings, isLoading } = useBookings();
  const { data: records } = usePassingRecords();

  const delivered = (bookings ?? []).filter((b) => b.status === "DELIVERED");

  return (
    <div>
      <PageHeader title="Passing" subtitle="Invoice, insurance, RTO passing and subsidy file" />
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>RTO number</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && delivered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No delivered bookings yet.</TableCell></TableRow>
              )}
              {delivered.map((b) => {
                const rec = (records ?? []).find((r) => r.booking_id === b.id);
                const out = Math.max(0, Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0));
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link to="/bookings/$bookingId" params={{ bookingId: b.id }} className="hover:underline">{b.booking_number}</Link>
                      <p className="text-xs text-muted-foreground">{fmtDate(b.booking_date)}</p>
                    </TableCell>
                    <TableCell>{b.customer?.customer_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{b.tractor_model}</TableCell>
                    <TableCell>
                      {rec?.rto_number ? <Badge variant="secondary">{rec.rto_number}</Badge> : <Badge variant="outline">Pending</Badge>}
                    </TableCell>
                    <TableCell className={out > 0 ? "text-destructive" : ""}>{inr(out)}</TableCell>
                    <TableCell className="text-right">
                      {rec?.passing_date ? (
                        <Badge variant="secondary">Done · {fmtDate(rec.passing_date)}</Badge>
                      ) : (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/passing/$bookingId" params={{ bookingId: b.id }}>Open</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
