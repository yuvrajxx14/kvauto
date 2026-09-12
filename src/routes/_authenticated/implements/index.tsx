import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Boxes, Package } from "lucide-react";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, SearchBox, FilterSelect, ClearFilters } from "@/components/sales/filters";
import { useImplementSales, IMPLEMENT_SALE_STATUS_LABEL, type ImplementSaleStatus } from "@/lib/implements";
import { usePerms } from "@/lib/permissions";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/implements/")({
  head: () => ({
    meta: [
      { title: "Implement Sales · KrushiVidhya Automobiles" },
      { name: "description", content: "Rotavator, cultivator and trolley sales with serial numbers, balance and payments." },
      { property: "og:title", content: "Implement Sales · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Implement sales register with balance and payment tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImplementSalesPage,
});

function ImplementSalesPage() {
  const perms = usePerms();
  const { data, isLoading } = useImplementSales();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [linked, setLinked] = useState("all");

  const all = data ?? [];
  const rows = all
    .filter((s) => status === "all" || s.status === status)
    .filter((s) => (linked === "all" ? true : linked === "with" ? !!s.booking_id : !s.booking_id))
    .filter((s) => {
      const term = q.trim().toLowerCase();
      if (!term) return true;
      const items = (s.items ?? []) as { item_name: string; serial_number: string | null }[];
      return [s.sale_number, s.customer?.customer_name, s.customer?.mobile, ...items.flatMap((i) => [i.item_name, i.serial_number])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });

  const outstanding = all.filter((s) => s.status !== "CANCELLED").reduce((sum, s) => sum + Number(s.balance ?? 0), 0);
  const sold = all.filter((s) => s.status !== "CANCELLED").length;
  const value = all.filter((s) => s.status !== "CANCELLED").reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0);

  const dirty = q !== "" || status !== "all" || linked !== "all";

  return (
    <div>
      <PageHeader
        title="Implement Sales"
        subtitle="Rotavator, cultivator, trolley and other implements sold with or without a tractor"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/implements/stock"><Boxes className="mr-1 h-4 w-4" /> Implement stock</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/implements/products"><Package className="mr-1 h-4 w-4" /> Implement master</Link>
            </Button>
            {perms.can("implements.sell") && (
              <Button asChild size="sm">
                <Link to="/implements/new" search={{ bookingId: "", customerId: "" }}><Plus className="mr-1 h-4 w-4" /> New sale</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Sales recorded" value={String(sold)} />
        <Metric label="Total sale value" value={inr(value)} />
        <Metric label="Outstanding" value={inr(outstanding)} />
      </div>

      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Search sale number, customer, implement or serial" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          className="w-48"
          options={[
            { value: "all", label: "All sales" },
            { value: "OPEN", label: "Balance pending" },
            { value: "PAID", label: "Fully paid" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <FilterSelect
          value={linked}
          onChange={setLinked}
          className="w-52"
          options={[
            { value: "all", label: "With or without tractor" },
            { value: "with", label: "Sold with a tractor" },
            { value: "without", label: "Implement only" },
          ]}
        />
        <ClearFilters show={dirty} onClear={() => { setQ(""); setStatus("all"); setLinked("all"); }} />
      </FilterBar>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Implements</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No implement sales match these filters.</TableCell></TableRow>
              )}
              {rows.map((s) => {
                const items = (s.items ?? []) as { id: string; item_name: string; serial_number: string | null }[];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link to="/implements/$saleId" params={{ saleId: s.id }} className="hover:underline">{s.sale_number}</Link>
                      <p className="text-xs text-muted-foreground">{fmtDate(s.sale_date)}</p>
                    </TableCell>
                    <TableCell>
                      {s.customer?.customer_name ?? "—"}
                      <p className="text-xs text-muted-foreground">
                        {s.booking?.booking_number ? `With ${s.booking.booking_number}` : "Implement only"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {items.map((i) => `${i.item_name}${i.serial_number ? ` (${i.serial_number})` : ""}`).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">{inr(s.total_amount)}</TableCell>
                    <TableCell className="text-right">{inr(s.balance)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "PAID" ? "secondary" : s.status === "CANCELLED" ? "outline" : "default"}>
                        {IMPLEMENT_SALE_STATUS_LABEL[s.status as ImplementSaleStatus] ?? s.status}
                      </Badge>
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
