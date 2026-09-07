import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sales/ui";
import { BookingBadge } from "@/components/sales/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, SearchBox, FilterSelect, ClearFilters, optionsFrom } from "@/components/sales/filters";
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
  const [model, setModel] = useState("all");
  const [finance, setFinance] = useState("all");
  const [payment, setPayment] = useState("all");
  const { data, isLoading } = useBookings(search);

  const all = data ?? [];
  const modelOptions = optionsFrom(all.map((b) => b.tractor_model), "All models");

  const outstandingOf = (b: (typeof all)[number]) =>
    Math.max(0, Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0));

  const rows = all
    .filter((b) => (status === "all" ? !["DELIVERED", "CANCELLED"].includes(b.status) : b.status === status))
    .filter((b) => model === "all" || b.tractor_model === model)
    .filter((b) => finance === "all" || (b.finance_type ?? "CASH") === finance)
    .filter((b) => {
      if (payment === "all") return true;
      const out = outstandingOf(b);
      return payment === "due" ? out > 1 : out <= 1;
    });

  const dirty = search !== "" || status !== "all" || model !== "all" || finance !== "all" || payment !== "all";
  const clear = () => {
    setSearch("");
    setStatus("all");
    setModel("all");
    setFinance("all");
    setPayment("all");
  };

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Active tractor bookings awaiting delivery" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Active bookings" value={String(rows.length)} />
      </div>

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search booking number or model" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          className="w-52"
          options={[
            { value: "all", label: "Active bookings" },
            ...BOOKING_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABEL[s] })),
          ]}
        />
        <FilterSelect value={model} onChange={setModel} options={modelOptions} className="w-44" />
        <FilterSelect
          value={finance}
          onChange={setFinance}
          className="w-40"
          options={[
            { value: "all", label: "Cash & loan" },
            { value: "CASH", label: "Cash deals" },
            { value: "LOAN", label: "Loan deals" },
          ]}
        />
        <FilterSelect
          value={payment}
          onChange={setPayment}
          className="w-44"
          options={[
            { value: "all", label: "Any balance" },
            { value: "due", label: "Balance pending" },
            { value: "clear", label: "Fully paid" },
          ]}
        />
        <ClearFilters show={dirty} onClear={clear} />
      </FilterBar>

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
                <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">No bookings match these filters.</TableCell></TableRow>
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
                    <TableCell>{b.customer?.customer_name ?? "—"}</TableCell>
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
