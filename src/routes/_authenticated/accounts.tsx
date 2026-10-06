import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/sales/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, FilterSelect, SearchBox, ClearFilters } from "@/components/sales/filters";
import { db, isReorder, useAccessories, useAccountInvoices, type Accessory } from "@/lib/accessories";
import { useSpareParts } from "@/lib/spare-inventory";
import { fmtDate, inr, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts · Purchase & sales invoices · KrushiVidhya Automobiles" },
      { name: "description", content: "Enter purchase and sales invoices, auto-update accessory and spare stock, and watch reorder levels." },
      { property: "og:title", content: "Accounts · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Purchase & sales invoices with automatic stock updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { data: acc } = useAccessories();
  const low = (acc ?? []).filter(isReorder);
  return (
    <div>
      <PageHeader title="Accounts" subtitle="Purchase and sales invoices update stock automatically" />
      {low.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <span><b>Reorder needed:</b> {low.map((a) => `${a.name} (${a.qty_on_hand} left)`).join(", ")}</span>
        </div>
      )}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="new">New invoice</TabsTrigger>
          <TabsTrigger value="accessories">Accessory stock</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices"><InvoiceList /></TabsContent>
        <TabsContent value="new"><NewInvoice /></TabsContent>
        <TabsContent value="accessories"><AccessoryStock /></TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceList() {
  const { data, isLoading } = useAccountInvoices();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const s = q.trim().toLowerCase();
  const rows = (data ?? [])
    .filter((r) => type === "all" || r.invoice_type === type)
    .filter((r) => !s || `${r.invoice_number} ${r.party_name}`.toLowerCase().includes(s));
  const sum = (t: string) => rows.filter((r) => r.invoice_type === t).reduce((a, r) => a + Number(r.total_amount), 0);
  return (
    <Card className="shadow-card">
      <CardContent className="pt-4">
        <FilterBar>
          <SearchBox value={q} onChange={setQ} placeholder="Search invoice number or party" />
          <FilterSelect value={type} onChange={setType} className="w-40" options={[{ value: "all", label: "All invoices" }, { value: "PURCHASE", label: "Purchase" }, { value: "SALE", label: "Sales" }]} />
          <ClearFilters show={!!q || type !== "all"} onClear={() => { setQ(""); setType("all"); }} />
        </FilterBar>
        <p className="mb-2 text-xs text-muted-foreground">Purchases {inr(sum("PURCHASE"))} · Sales {inr(sum("SALE"))}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Invoice no.</TableHead>
              <TableHead>Party</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>}
            {rows.map((r) => (
              <>
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <TableCell className="text-xs">{fmtDate(r.invoice_date)}</TableCell>
                  <TableCell><Badge variant={r.invoice_type === "PURCHASE" ? "secondary" : "default"}>{r.invoice_type === "PURCHASE" ? "Purchase" : "Sale"}</Badge></TableCell>
                  <TableCell>{r.invoice_number}</TableCell>
                  <TableCell>{r.party_name}</TableCell>
                  <TableCell className="text-right">{inr(r.total_amount)}</TableCell>
                </TableRow>
                {open === r.id && (r.items ?? []).map((it) => (
                  <TableRow key={it.id} className="bg-muted/40 text-xs">
                    <TableCell /><TableCell colSpan={2}>{it.description}</TableCell>
                    <TableCell>{it.qty} × {inr(it.rate)}</TableCell>
                    <TableCell className="text-right">{inr(it.amount)}</TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type Line = { kind: string; ref: string; description: string; qty: string; rate: string };
const emptyLine = (): Line => ({ kind: "ACCESSORY", ref: "", description: "", qty: "1", rate: "" });

function NewInvoice() {
  const qc = useQueryClient();
  const { data: acc } = useAccessories();
  const { data: spares } = useSpareParts({});
  const [type, setType] = useState("PURCHASE");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [party, setParty] = useState("");
  const [gstin, setGstin] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const upd = (i: number, p: Partial<Line>) => setLines((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);

  async function save() {
    if (!number || !party) return void toast.error("Enter invoice number and party");
    const items = lines.map((l) => {
      const name = l.kind === "ACCESSORY" ? acc?.find((a) => a.id === l.ref)?.name : l.kind === "SPARE" ? spares?.find((p) => p.id === l.ref)?.part_name : l.description;
      return {
        kind: l.kind,
        accessory_id: l.kind === "ACCESSORY" ? l.ref : "",
        spare_part_id: l.kind === "SPARE" ? l.ref : "",
        description: name || l.description || "Item",
        qty: Number(l.qty || 0),
        rate: Number(l.rate || 0),
      };
    });
    if (items.some((i) => (i.kind !== "OTHER" && !i.accessory_id && !i.spare_part_id) || i.qty <= 0)) return void toast.error("Complete every line");
    setBusy(true);
    const { error } = await db.rpc("create_account_invoice", { _type: type, _number: number, _date: date, _party: party, _gstin: gstin, _remarks: "", _items: items });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Invoice saved and stock updated");
    setNumber(""); setParty(""); setGstin(""); setLines([emptyLine()]);
    qc.invalidateQueries();
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2"><CardTitle className="text-base">New invoice</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-5">
          <div><Label>Type</Label><FilterSelect value={type} onChange={setType} className="w-full" options={[{ value: "PURCHASE", label: "Purchase (stock in)" }, { value: "SALE", label: "Sale (stock out)" }]} /></div>
          <div><Label>Invoice no.</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>{type === "PURCHASE" ? "Supplier" : "Customer"}</Label><Input value={party} onChange={(e) => setParty(e.target.value)} /></div>
          <div><Label>GSTIN</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} /></div>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
            <div><Label className="text-xs">Item type</Label>
              <FilterSelect value={l.kind} onChange={(v) => upd(i, { kind: v, ref: "" })} className="w-36" options={[{ value: "ACCESSORY", label: "Accessory" }, { value: "SPARE", label: "Spare part" }, { value: "OTHER", label: "Other (no stock)" }]} />
            </div>
            <div className="min-w-48 flex-1"><Label className="text-xs">Item</Label>
              {l.kind === "ACCESSORY" ? (
                <FilterSelect value={l.ref} onChange={(v) => upd(i, { ref: v })} className="w-full" placeholder="Select accessory" options={(acc ?? []).map((a) => ({ value: a.id, label: `${a.name} (${a.qty_on_hand})` }))} />
              ) : l.kind === "SPARE" ? (
                <FilterSelect value={l.ref} onChange={(v) => upd(i, { ref: v })} className="w-full" placeholder="Select spare part" options={(spares ?? []).map((p) => ({ value: p.id, label: `${p.part_number} · ${p.part_name} (${p.qty_on_hand})` }))} />
              ) : (
                <Input value={l.description} onChange={(e) => upd(i, { description: e.target.value })} placeholder="Description" />
              )}
            </div>
            <div><Label className="text-xs">Qty</Label><Input type="number" value={l.qty} onChange={(e) => upd(i, { qty: e.target.value })} className="w-20" /></div>
            <div><Label className="text-xs">Rate</Label><Input type="number" value={l.rate} onChange={(e) => upd(i, { rate: e.target.value })} className="w-28" /></div>
            <p className="w-28 pb-2 text-right text-sm">{inr(Number(l.qty || 0) * Number(l.rate || 0))}</p>
            <Button size="icon" variant="ghost" disabled={lines.length === 1} onClick={() => setLines((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => setLines((l) => [...l, emptyLine()])}><Plus className="mr-1 h-4 w-4" /> Add line</Button>
          <div className="flex items-center gap-3">
            <span className="font-semibold">Total {inr(total)}</span>
            <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save invoice"}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccessoryStock() {
  const qc = useQueryClient();
  const { data } = useAccessories();
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  async function setLevel(a: Accessory, reorder_level: number) {
    const { error } = await db.from("accessories").update({ reorder_level }).eq("id", a.id);
    if (error) return void toast.error(error.message);
    toast.success("Reorder level updated");
    qc.invalidateQueries({ queryKey: ["accessories"] });
  }
  return (
    <Card className="shadow-card">
      <CardContent className="pt-4">
        <FilterBar><SearchBox value={q} onChange={setQ} placeholder="Search accessory" /></FilterBar>
        <p className="mb-2 text-xs text-muted-foreground">Add stock with a purchase invoice. One set is deducted automatically when ticked on a tractor delivery.</p>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Accessory</TableHead><TableHead className="text-right">In stock</TableHead><TableHead className="text-right">Reorder level</TableHead><TableHead>Status</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-right">{a.qty_on_hand}</TableCell>
                <TableCell className="text-right">
                  <Input type="number" defaultValue={a.reorder_level} className="ml-auto h-8 w-20"
                    onBlur={(e) => Number(e.target.value) !== Number(a.reorder_level) && setLevel(a, Number(e.target.value))} />
                </TableCell>
                <TableCell>{isReorder(a) ? <Badge variant="destructive">Reorder</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
