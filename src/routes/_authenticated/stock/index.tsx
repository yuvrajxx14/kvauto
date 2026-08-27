import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { StockBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemandVsStock, useStock } from "@/lib/erp";
import { useMe } from "@/lib/auth";
import { STOCK_STATUSES, STOCK_STATUS_LABEL, STOCK_LOCATIONS, TRACTOR_COLOURS, type StockStatus } from "@/lib/stock";
import { VARIANTS } from "@/lib/sales";
import { ModelSelect } from "@/components/sales/model-select";

export const Route = createFileRoute("/_authenticated/stock/")({
  head: () => ({
    meta: [
      { title: "Tractor Stock · KrushiVidhya Automobiles" },
      { name: "description", content: "Live tractor inventory, model-wise demand vs stock and order requirements." },
      { property: "og:title", content: "Tractor Stock · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Live tractor inventory and order requirements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [status, setStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { rows, isLoading } = useDemandVsStock();
  const units = useStock({ status });

  const addStock = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const { error } = await supabase.from("tractor_stock").insert({
        chassis_number: payload["chassis_number"]!,
        engine_number: payload["engine_number"]!,
        model: payload["model"]!,
        variant: payload["variant"] || null,
        colour: payload["colour"] || null,
        mfg_year: payload["mfg_year"] || null,
        location: payload["location"] || "Main Showroom",
        arrival_date: payload["arrival_date"] || null,
        received_from: payload["received_from"] || null,
        status: "INSPECTION_PENDING",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock unit received");
      setAddOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = rows.reduce(
    (a, r) => ({
      available: a.available + r.available,
      held: a.held + r.reserved + r.allocated,
      incoming: a.incoming + r.incoming,
      shortage: a.shortage + r.requiredForBookings,
    }),
    { available: 0, held: 0, incoming: 0, shortage: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Tractor Stock"
        subtitle="Model-wise demand vs stock, inspection status and order requirement"
        actions={
          me?.isManagement ? (
            <Button size="sm" onClick={() => setAddOpen((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" /> Receive stock
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Available" value={String(totals.available)} />
        <Metric label="Reserved / allocated" value={String(totals.held)} />
        <Metric label="Incoming" value={String(totals.incoming)} />
        <Metric label="Units short for bookings" value={String(totals.shortage)} />
      </div>

      {addOpen && (
        <Card className="mb-4 shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Receive new tractor</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const payload = Object.fromEntries(
                  Array.from(fd.entries()).map(([k, v]) => [k, String(v)]),
                ) as Record<string, string>;
                if (!payload["chassis_number"] || !payload["engine_number"]) {
                  toast.error("Chassis and engine number are required");
                  return;
                }
                addStock.mutate(payload);
              }}
            >
              <div><Label>Chassis number</Label><Input name="chassis_number" required /></div>
              <div><Label>Engine number</Label><Input name="engine_number" required /></div>
              <div>
                <Label>Model</Label>
                <ModelSelect name="model" />
              </div>
              <div>
                <Label>Variant</Label>
                <Select name="variant" defaultValue={VARIANTS[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VARIANTS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colour</Label>
                <Select name="colour" defaultValue={TRACTOR_COLOURS[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRACTOR_COLOURS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Manufacturing year</Label><Input name="mfg_year" placeholder="2026" /></div>
              <div>
                <Label>Location</Label>
                <Select name="location" defaultValue={STOCK_LOCATIONS[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STOCK_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Arrival date</Label><Input name="arrival_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div><Label>Received from</Label><Input name="received_from" placeholder="Mahindra company / dealer name" defaultValue="Mahindra Company" /></div>
              <div className="flex items-end"><Button disabled={addStock.isPending}>{addStock.isPending ? "Saving…" : "Add to stock"}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Demand vs stock</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Incoming</TableHead>
                <TableHead className="text-right">Open bookings</TableHead>
                <TableHead className="text-right">Min regular</TableHead>
                <TableHead className="text-right">Suggested order</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.model}>
                  <TableCell className="font-medium">{r.model}</TableCell>
                  <TableCell className="text-right">{r.available}</TableCell>
                  <TableCell className="text-right">{r.reserved + r.allocated}</TableCell>
                  <TableCell className="text-right">{r.incoming}</TableCell>
                  <TableCell className="text-right">{r.pendingDemand}</TableCell>
                  <TableCell className="text-right">{r.minRegular}</TableCell>
                  <TableCell className="text-right font-semibold">{r.suggestedOrder}</TableCell>
                  <TableCell>
                    {r.orderRequired ? (
                      <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                        Order required
                      </span>
                    ) : r.belowMinimum ? (
                      <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                        Below minimum
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">OK</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mb-3 flex justify-end">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock statuses</SelectItem>
            {STOCK_STATUSES.map((s) => <SelectItem key={s} value={s}>{STOCK_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chassis</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Colour</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Inspection</TableHead>
                <TableHead>PDI</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.data?.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No stock units.</TableCell></TableRow>
              )}
              {(units.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link to="/stock/$stockId" params={{ stockId: u.id }} className="hover:underline">{u.chassis_number}</Link>
                  </TableCell>
                  <TableCell>{u.model}</TableCell>
                  <TableCell>{u.colour ?? "—"}</TableCell>
                  <TableCell>{u.location}</TableCell>
                  <TableCell className="text-xs">{u.inspection_status}</TableCell>
                  <TableCell className="text-xs">{u.pdi_status}</TableCell>
                  <TableCell><StockBadge status={u.status as StockStatus} /></TableCell>
                </TableRow>
              ))}
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
