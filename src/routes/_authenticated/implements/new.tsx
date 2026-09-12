import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBox } from "@/components/sales/filters";
import { useCustomerOptions, useImplementStock } from "@/lib/implements";
import { useBookings } from "@/lib/erp";
import { useSalesStaff } from "@/lib/queries";
import { inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/implements/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    bookingId: String(search["bookingId"] ?? ""),
    customerId: String(search["customerId"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "New Implement Sale · KrushiVidhya Automobiles" },
      { name: "description", content: "Record an implement sale with serial numbers, with or without a tractor booking." },
      { property: "og:title", content: "New Implement Sale · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Record an implement sale for a customer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewImplementSale,
});

function NewImplementSale() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: customers } = useCustomerOptions();
  const { data: bookings } = useBookings();
  const { data: staff } = useSalesStaff();
  const stock = useImplementStock("AVAILABLE");

  const [bookingId, setBookingId] = useState(search.bookingId || "none");
  const [customerId, setCustomerId] = useState(search.customerId || "");
  const [salesmanId, setSalesmanId] = useState("");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});

  const openBookings = (bookings ?? []).filter((b) => b.status !== "CANCELLED");

  const customerList = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    const list = customers ?? [];
    if (!term) return list.slice(0, 30);
    return list
      .filter((c) => [c.customer_name, c.mobile, c.village].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)))
      .slice(0, 30);
  }, [customers, customerSearch]);

  const units = stock.data ?? [];
  const total = Object.entries(picked).reduce((sum, [, price]) => sum + (Number(price) || 0), 0);

  const create = useMutation({
    mutationFn: async () => {
      const items = Object.entries(picked).map(([stock_id, price]) => ({ stock_id, price: Number(price) || 0 }));
      const { data, error } = await supabase.rpc("create_implement_sale_atomic", {
        _customer_id: customerId,
        _booking_id: (bookingId === "none" ? null : bookingId) as string,
        _salesman_id: (salesmanId || null) as string,
        _sale_date: saleDate,
        _remarks: remarks,
        _items: items,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      toast.success("Implement sale created");
      qc.invalidateQueries();
      navigate({ to: "/implements/$saleId", params: { saleId: String(id) } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePick = (id: string, defaultPrice: number) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) delete next[id];
      else next[id] = String(defaultPrice || "");
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="New implement sale"
        subtitle="Sell one or more implements, with or without a tractor booking"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/implements"><ArrowLeft className="mr-1 h-4 w-4" /> Implement sales</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Customer &amp; sale details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Sold with a tractor booking</Label>
              <Select
                value={bookingId}
                onValueChange={(v) => {
                  setBookingId(v);
                  const b = openBookings.find((x) => x.id === v);
                  if (b) setCustomerId(b.customer_id);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Implement only (no tractor)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Implement only (no tractor)</SelectItem>
                  {openBookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.booking_number} · {b.customer?.customer_name ?? "—"} · {b.tractor_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="Search customer name, mobile or village" />
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customerList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customer_name} · {c.mobile}{c.village ? ` · ${c.village}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Salesman</Label>
              <Select value={salesmanId} onValueChange={setSalesmanId}>
                <SelectTrigger><SelectValue placeholder="Select salesman" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div><Label>Sale date</Label><Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div>
            <div><Label>Remarks</Label><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={1000} /></div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Pick implements from stock</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stock.isLoading && <p className="text-sm text-muted-foreground">Loading stock…</p>}
            {!stock.isLoading && units.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No implements are in stock. Add units from{" "}
                <Link className="text-primary hover:underline" to="/implements/stock">Implement Stock</Link>.
              </p>
            )}
            {units.map((u) => {
              const selected = picked[u.id] !== undefined;
              return (
                <div key={u.id} className={`rounded-md border p-2 text-sm ${selected ? "border-primary" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{u.item_name}</p>
                      <p className="text-xs text-muted-foreground">{u.serial_number} · {u.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected && (
                        <Input
                          className="h-8 w-32"
                          type="number"
                          min="1"
                          step="0.01"
                          value={picked[u.id] ?? ""}
                          onChange={(e) => setPicked((p) => ({ ...p, [u.id]: e.target.value }))}
                        />
                      )}
                      <Button
                        size="sm"
                        variant={selected ? "secondary" : "outline"}
                        onClick={() => togglePick(u.id, Number(u.sale_price ?? 0))}
                      >
                        {selected ? "Remove" : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-sm text-muted-foreground">Sale total</p>
              <p className="text-lg font-semibold">{inr(total)}</p>
            </div>

            <Button
              className="w-full"
              disabled={create.isPending}
              onClick={() => {
                if (!customerId) { toast.error("Select the customer"); return; }
                if (Object.keys(picked).length === 0) { toast.error("Add at least one implement"); return; }
                if (Object.values(picked).some((p) => !(Number(p) > 0))) { toast.error("Enter a price for every implement"); return; }
                create.mutate();
              }}
            >
              {create.isPending ? "Saving…" : "Create implement sale"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
