import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, SearchBox, FilterSelect, ClearFilters, optionsFrom } from "@/components/sales/filters";
import {
  useImplementProducts,
  useImplementStock,
  IMPLEMENT_LOCATIONS,
  IMPLEMENT_STOCK_STATUS_LABEL,
  IMPLEMENT_STOCK_STATUSES,
  type ImplementStockStatus,
} from "@/lib/implements";
import { usePerms } from "@/lib/permissions";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/implements/stock")({
  head: () => ({
    meta: [
      { title: "Implement Stock · KrushiVidhya Automobiles" },
      { name: "description", content: "Serial-wise implement inventory: rotavators, cultivators, trolleys and more." },
      { property: "og:title", content: "Implement Stock · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Serial-wise implement inventory and availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImplementStockPage,
});

function ImplementStockPage() {
  const qc = useQueryClient();
  const perms = usePerms();
  const { data: products } = useImplementProducts(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [item, setItem] = useState("all");
  const [location, setLocation] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const stock = useImplementStock(status);

  const all = stock.data ?? [];
  const itemOptions = optionsFrom(all.map((u) => u.item_name), "All implements");
  const locationOptions = optionsFrom(all.map((u) => u.location), "All locations");
  const rows = all
    .filter((u) => item === "all" || u.item_name === item)
    .filter((u) => location === "all" || u.location === location)
    .filter((u) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [u.serial_number, u.item_name, u.received_from].filter(Boolean).some((v) => String(v).toLowerCase().includes(s));
    });

  const add = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const product = (products ?? []).find((p) => p.id === payload["product_id"]);
      if (!product) throw new Error("Select an implement from the master list");
      const { error } = await supabase.from("implement_stock").insert({
        product_id: product.id,
        item_name: product.name,
        serial_number: payload["serial_number"]!.trim().toUpperCase(),
        purchase_price: Number(payload["purchase_price"] || 0),
        sale_price: Number(payload["sale_price"] || product.default_price || 0),
        location: payload["location"] || "Main Showroom",
        received_from: payload["received_from"] || null,
        arrival_date: payload["arrival_date"] || null,
        status: "AVAILABLE",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Implement added to stock");
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["implement-stock"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("implement_stock_serial_uidx") ? "That serial number already exists" : e.message),
  });

  const available = all.filter((u) => u.status === "AVAILABLE").length;
  const soldCount = all.filter((u) => u.status === "SOLD").length;

  const dirty = q !== "" || status !== "all" || item !== "all" || location !== "all";

  return (
    <div>
      <PageHeader
        title="Implement Stock"
        subtitle="Every implement unit tracked by its own serial number"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/implements"><ArrowLeft className="mr-1 h-4 w-4" /> Implement sales</Link>
            </Button>
            {perms.can("implements.stock") && (
              <Button size="sm" onClick={() => setAddOpen((v) => !v)}>
                <Plus className="mr-1 h-4 w-4" /> Receive implement
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="In stock" value={String(available)} />
        <Metric label="Sold" value={String(soldCount)} />
        <Metric label="Total units" value={String(all.length)} />
      </div>

      {addOpen && (
        <Card className="mb-4 shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Receive new implement</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const payload = Object.fromEntries(Array.from(fd.entries()).map(([k, v]) => [k, String(v)])) as Record<string, string>;
                payload["product_id"] = productId;
                if (!payload["serial_number"]?.trim()) { toast.error("Serial number is required"); return; }
                if (!productId) { toast.error("Select the implement"); return; }
                add.mutate(payload);
              }}
            >
              <div>
                <Label>Implement</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Select implement" /></SelectTrigger>
                  <SelectContent>
                    {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Serial number</Label><Input name="serial_number" required /></div>
              <div><Label>Purchase price</Label><Input name="purchase_price" type="number" min="0" step="0.01" /></div>
              <div><Label>Selling price</Label><Input name="sale_price" type="number" min="0" step="0.01" /></div>
              <div>
                <Label>Location</Label>
                <Select name="location" defaultValue={IMPLEMENT_LOCATIONS[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{IMPLEMENT_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Received from</Label><Input name="received_from" placeholder="Supplier / company name" /></div>
              <div><Label>Arrival date</Label><Input name="arrival_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div className="flex items-end"><Button disabled={add.isPending}>{add.isPending ? "Saving…" : "Add to stock"}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <FilterBar>
        <SearchBox value={q} onChange={setQ} placeholder="Search serial number, implement or supplier" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          className="w-44"
          options={[{ value: "all", label: "All statuses" }, ...IMPLEMENT_STOCK_STATUSES.map((s) => ({ value: s, label: IMPLEMENT_STOCK_STATUS_LABEL[s] }))]}
        />
        <FilterSelect value={item} onChange={setItem} options={itemOptions} className="w-48" />
        <FilterSelect value={location} onChange={setLocation} options={locationOptions} className="w-44" />
        <ClearFilters show={dirty} onClear={() => { setQ(""); setStatus("all"); setItem("all"); setLocation("all"); }} />
      </FilterBar>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Implement</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Selling price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!stock.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No implement units match these filters.</TableCell></TableRow>
              )}
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.serial_number}</TableCell>
                  <TableCell>{u.item_name}</TableCell>
                  <TableCell>{u.location}</TableCell>
                  <TableCell className="text-xs">
                    {fmtDate(u.arrival_date)}
                    {u.received_from ? ` · ${u.received_from}` : ""}
                  </TableCell>
                  <TableCell className="text-right">{inr(u.sale_price)}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "AVAILABLE" ? "secondary" : "outline"}>
                      {IMPLEMENT_STOCK_STATUS_LABEL[u.status as ImplementStockStatus] ?? u.status}
                    </Badge>
                  </TableCell>
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
