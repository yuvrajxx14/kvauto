import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, SearchBox, FilterSelect, ClearFilters, optionsFrom } from "@/components/sales/filters";
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
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("pending");
  const [model, setModel] = useState("all");
  const [balance, setBalance] = useState("all");

  const delivered = (bookings ?? []).filter((b) => b.status === "DELIVERED");
  const modelOptions = optionsFrom(delivered.map((b) => b.tractor_model), "All models");

  const rows = delivered.filter((b) => {
    const rec = (records ?? []).find((r) => r.booking_id === b.id);
    const done = !!rec?.passing_date;
    if (stage === "pending" && done) return false;
    if (stage === "done" && !done) return false;
    if (model !== "all" && b.tractor_model !== model) return false;
    const out = Math.max(0, Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0));
    if (balance === "due" && out <= 1) return false;
    if (balance === "clear" && out > 1) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [b.booking_number, b.customer?.customer_name, b.tractor_model, rec?.rto_number, rec?.number_plate_number]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(s));
  });

  const dirty = q !== "" || stage !== "pending" || model !== "all" || balance !== "all";
  const clear = () => {
    setQ("");
    setStage("pending");
    setModel("all");
    setBalance("all");
  };

  return (
    <div>
      <PageHeader title="Passing" subtitle="Invoice, insurance, RTO passing and subsidy file" />

      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Search booking, customer, RTO or number plate" />
        <FilterSelect
          value={stage}
          onChange={setStage}
          className="w-48"
          options={[
            { value: "pending", label: "Passing pending" },
            { value: "done", label: "Passing done" },
            { value: "all", label: "All delivered" },
          ]}
        />
        <FilterSelect value={model} onChange={setModel} options={modelOptions} className="w-44" />
        <FilterSelect
          value={balance}
          onChange={setBalance}
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
                <TableHead>RTO number</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Nothing matches these filters.</TableCell></TableRow>
              )}
              {rows.map((b) => {
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
