import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DeleteRecordButton } from "@/components/sales/delete-button";
import { PageHeader, Field } from "@/components/sales/ui";
import { StockBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockItem } from "@/lib/erp";
import { type StockStatus } from "@/lib/stock";
import { fmtDate } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/stock/$stockId")({
  head: () => ({
    meta: [
      { title: "Stock unit · KrushiVidhya Automobiles" },
      { name: "description", content: "Chassis-wise tractor record for received stock units." },
      { property: "og:title", content: "Stock unit · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Details for a received tractor unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockDetail,
});

function StockDetail() {
  const { stockId } = Route.useParams();
  const { data: u, isLoading } = useStockItem(stockId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!u) return <PageHeader title="Stock unit not found" />;

  return (
    <div>
      <PageHeader
        title={u.chassis_number}
        subtitle={`${u.model} · ${u.variant ?? "—"} · ${u.location}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/stock"><ArrowLeft className="mr-1 h-4 w-4" /> All stock</Link>
            </Button>
            <DeleteRecordButton table="tractor_stock" id={stockId} label="this stock unit" redirectTo="/stock" />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Unit details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Field label="Engine number">{u.engine_number}</Field>
            <Field label="Colour">{u.colour ?? "—"}</Field>
            <Field label="Mfg year">{u.mfg_year ?? "—"}</Field>
            <Field label="Arrival date">{fmtDate(u.arrival_date)}</Field>
            <Field label="Order reference">{u.order_reference ?? "—"}</Field>
            <div className="pt-1"><StockBadge status={u.status as StockStatus} /></div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
        </div>
      </div>
    </div>
  );
}
