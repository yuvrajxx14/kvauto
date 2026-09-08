import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sales/ui";
import { BookingBadge } from "@/components/sales/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, SearchBox, FilterSelect, ClearFilters, optionsFrom } from "@/components/sales/filters";
import { useBookings } from "@/lib/erp";
import { type BookingStatus } from "@/lib/booking";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/delivery/")({
  head: () => ({
    meta: [
      { title: "Delivery \u00b7 KrushiVidhya Automobiles" },
      { name: "description", content: "Tractors allocated and ready for delivery with payment and document readiness." },
      { property: "og:title", content: "Delivery \u00b7 KrushiVidhya Automobiles" },
      { property: "og:description", content: "Delivery-ready tractors and pending deliveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeliveryPage,
});

function DeliveryPage() {
  const { data, isLoading } = useBookings();
  const [q, setQ] = useState("");
  const [view, setView] = useState("pending");
  const [model, setModel] = useState("all");
  const [alloc, setAlloc] = useState("all");

  const all = (data ?? []).filter((b) => b.status !== "CANCELLED");
  const pending = all.filter((b) => b.status !== "DELIVERED");
  const delivered = all.filter((b) => b.status === "DELIVERED");
  const modelOptions = optionsFrom(all.map((b) => b.tractor_model), "All models");

  const rows = all
    .filter((b) =>
      view === "pending" ? b.status !== "DELIVERED" : view === "delivered" ? b.status === "DELIVERED" : true,
    )
    .filter((b) => model === "all" || b.tractor_model === model)
    .filter((b) => {
      if (alloc === "all") return true;
      const a = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
      return alloc === "allocated" ? !!a : !a;
    })
    .filter((b) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      const a = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
      return [b.booking_number, b.customer?.customer_name, b.tractor_model, a?.chassis_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });

  const dirty = q !== "" || view !== "pending" || model !== "all" || alloc !== "all";
  const clear = () => {
    setQ("");
    setView("pending");
    setModel("all");
    setAlloc("all");
  };

  return (
    <div>
      <PageHeader title="Delivery" subtitle="Allocated tractors, pending balance and delivery completion" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Pending deliveries" value={String(pending.length)} />
        <Metric label="Allocated" value={String(pending.filter((b) => b.status === "ALLOCATED" || b.status === "READY_FOR_DELIVERY").length)} />
        <Metric label="Delivered" value={String(delivered.length)} />
      </div>

      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Search booking, customer, model or chassis" />
        <FilterSelect
          value={view}
          onChange={setView}
          className="w-48"
          options={[
            { value: "pending", label: "Pending deliveries" },
            { value: "delivered", label: "Delivered" },
            { value: "all", label: "All bookings" },
          ]}
        />
        <FilterSelect value={model} onChange={setModel} options={modelOptions} className="w-44" />
        <FilterSelect
          value={alloc}
          onChange={setAlloc}
          className="w-48"
          options={[
            { value: "all", label: "Any tractor" },
            { value: "allocated", label: "Tractor allocated" },
            { value: "unallocated", label: "Not allocated" },
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
                <TableHead>Chassis</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading\u2026</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Nothing matches these filters.</TableCell></TableRow>}
              {rows.map((b) => {
                const a = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
                const outstanding = Math.max(0, Number(b.final_price ?? 0) - Number(b.amount_received ?? 0));
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <Link to="/delivery/$bookingId" params={{ bookingId: b.id }} className="hover:underline">{b.booking_number}</Link>
                      <p className="text-xs text-muted-foreground">{fmtDate(b.booking_date)}</p>
                    </TableCell>
                    <TableCell>{b.customer?.customer_name ?? "\u2014"}</TableCell>
                    <TableCell>{b.tractor_model}</TableCell>
                    <TableCell className="text-xs">{a?.chassis_number ?? "Not allocated"}</TableCell>
                    <TableCell className="text-right">{inr(outstanding)}</TableCell>
                    <TableCell><BookingBadge status={b.status as BookingStatus} /></TableCell>
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
