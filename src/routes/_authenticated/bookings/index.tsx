import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/sales/ui";
import { BookingBadge } from "@/components/sales/badges";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBookings } from "@/lib/erp";
import { BOOKING_STATUSES, BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/booking";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings · KrushiVidhya Automobiles" },
      { name: "description", content: "Tractor bookings, collections and delivery readiness for KrushiVidhya Automobiles." },
      { property: "og:title", content: "Bookings · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Track tractor bookings, payments and allocation status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useBookings(search);

  const rows = (data ?? []).filter((b) =>
    status === "all" ? !["DELIVERED", "CANCELLED"].includes(b.status) : b.status === status,
  );

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Active tractor bookings awaiting delivery" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Active bookings" value={String(rows.length)} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search booking number or model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{BOOKING_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Deal price</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chassis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">No bookings yet.</TableCell></TableRow>
              )}
              {rows.map((b) => {
                const received = Number(b.amount_received ?? 0);
                const outstanding = Math.max(0, Number(b.final_price ?? 0) - received);
                const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
                return (
                  <TableRow key={b.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to="/bookings/$bookingId" params={{ bookingId: b.id }} className="hover:underline">
                        {b.booking_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{fmtDate(b.booking_date)}</p>
                    </TableCell>
                    <TableCell>
                      <p>{b.customer?.customer_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{b.customer?.village ?? ""}</p>
                    </TableCell>
                    <TableCell>{b.tractor_model}</TableCell>
                    <TableCell className="text-right">{inr(b.final_price)}</TableCell>
                    <TableCell className="text-right">{inr(received)}</TableCell>
                    <TableCell className="text-right font-medium">{inr(outstanding)}</TableCell>
                    <TableCell><BookingBadge status={b.status as BookingStatus} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{alloc?.chassis_number ?? "—"}</TableCell>
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
