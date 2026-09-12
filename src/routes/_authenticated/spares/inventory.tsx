import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Download, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FilterBar, SearchBox, FilterSelect, ClearFilters, optionsFrom } from "@/components/sales/filters";
import { inr } from "@/lib/sales";
import { parseCsv, toCsv, downloadCsv } from "@/lib/bulk-import";
import { usePerms } from "@/lib/permissions";
import {
  SPARE_UPLOAD_COLUMNS,
  isLow,
  stockValue,
  useSpareParts,
  type SparePart,
} from "@/lib/spare-inventory";

export const Route = createFileRoute("/_authenticated/spares/inventory")({
  head: () => ({
    meta: [
      { title: "Spare Parts Inventory · KrushiVidhya Automobiles" },
      {
        name: "description",
        content: "Track spare parts stock on hand, rack location, rates and low-stock alerts, with bulk upload of current stock.",
      },
      { property: "og:title", content: "Spare Parts Inventory · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Live spare parts stock with bulk current-stock upload." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpareInventoryPage,
});

function SpareInventoryPage() {
  const perms = usePerms();
  const canManage = perms.isManagement || perms.hasRole("sparepart_manager");
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [moveFor, setMoveFor] = useState<{ part: SparePart; kind: "IN" | "OUT" | "ADJUST" } | null>(null);

  const { data, isLoading } = useSpareParts({ search });
  const all = data ?? [];
  const categoryOptions = optionsFrom(all.map((p) => p.category), "All categories");
  const rows = all
    .filter((p) => category === "all" || p.category === category)
    .filter((p) =>
      stock === "all"
        ? true
        : stock === "low"
          ? isLow(p)
          : stock === "out"
            ? Number(p.qty_on_hand) <= 0
            : Number(p.qty_on_hand) > 0,
    );

  const dirty = search !== "" || category !== "all" || stock !== "all";
  const lowCount = useMemo(() => all.filter(isLow).length, [all]);

  const savePart = useMutation({
    mutationFn: async (p: Record<string, string>) => {
      const { error } = await supabase.from("spare_parts").insert({
        part_number: p.part_number.trim(),
        part_name: p.part_name.trim(),
        category: p.category?.trim() || null,
        brand: p.brand?.trim() || null,
        rack_location: p.rack_location?.trim() || null,
        purchase_rate: Number(p.purchase_rate) || 0,
        sale_rate: Number(p.sale_rate) || 0,
        qty_on_hand: Number(p.qty) || 0,
        min_qty: Number(p.min_qty) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Part added");
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["spare-parts"] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("spare_parts_number_uidx") ? "This part number already exists" : e.message),
  });

  const move = useMutation({
    mutationFn: async (p: { part_id: string; kind: string; qty: number; rate: number; remarks: string }) => {
      const { error } = await supabase.rpc("record_spare_movement", {
        _part_id: p.part_id,
        _movement_type: p.kind,
        _qty: p.qty,
        _rate: p.rate,
        _remarks: (p.remarks || null) as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock updated");
      setMoveFor(null);
      qc.invalidateQueries({ queryKey: ["spare-parts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Spare parts inventory"
        subtitle="Live stock on hand, rack location and rates for every part"
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-1 h-4 w-4" /> Upload current stock
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Add part
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Parts" value={String(all.length)} />
        <Metric label="Stock value" value={inr(stockValue(all))} />
        <Metric label="Low / out of stock" value={String(lowCount)} />
      </div>

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search part name, part number, rack" />
        <FilterSelect value={category} onChange={setCategory} options={categoryOptions} className="w-48" />
        <FilterSelect
          value={stock}
          onChange={setStock}
          className="w-44"
          options={[
            { value: "all", label: "All stock" },
            { value: "in", label: "In stock" },
            { value: "low", label: "Low stock" },
            { value: "out", label: "Out of stock" },
          ]}
        />
        <ClearFilters
          show={dirty}
          onClear={() => {
            setSearch("");
            setCategory("all");
            setStock("all");
          }}
        />
      </FilterBar>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>In stock</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Value</TableHead>
                {canManage && <TableHead className="text-right">Stock</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No parts here yet. Use “Upload current stock” to load your existing stock sheet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.part_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.part_number}
                      {p.category ? ` · ${p.category}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{p.rack_location ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">{Number(p.qty_on_hand)}</span>{" "}
                    <span className="text-xs text-muted-foreground">{p.unit}</span>
                    {isLow(p) && (
                      <Badge variant="secondary" className="ml-2 bg-warning/15 text-warning">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Low
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{inr(Number(p.sale_rate))}</TableCell>
                  <TableCell className="text-sm">
                    {inr(Number(p.qty_on_hand) * Number(p.purchase_rate || p.sale_rate || 0))}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setMoveFor({ part: p, kind: "IN" })}>
                          <ArrowDownToLine className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setMoveFor({ part: p, kind: "OUT" })}>
                          <ArrowUpFromLine className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add part */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add spare part</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const v = Object.fromEntries(Array.from(fd.entries()).map(([k, x]) => [k, String(x)]));
              if (!v.part_number?.trim() || !v.part_name?.trim()) {
                toast.error("Part number and part name are required");
                return;
              }
              savePart.mutate(v);
            }}
          >
            <div>
              <Label>Part number</Label>
              <Input name="part_number" required maxLength={60} />
            </div>
            <div>
              <Label>Part name</Label>
              <Input name="part_name" required maxLength={120} />
            </div>
            <div>
              <Label>Category</Label>
              <Input name="category" maxLength={60} placeholder="Filters / Engine / Hydraulic" />
            </div>
            <div>
              <Label>Brand</Label>
              <Input name="brand" maxLength={60} placeholder="Mahindra Genuine" />
            </div>
            <div>
              <Label>Rack / location</Label>
              <Input name="rack_location" maxLength={40} />
            </div>
            <div>
              <Label>Current stock</Label>
              <Input name="qty" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <Label>Purchase rate</Label>
              <Input name="purchase_rate" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <Label>Selling rate</Label>
              <Input name="sale_rate" type="number" step="0.01" defaultValue="0" />
            </div>
            <div>
              <Label>Minimum stock</Label>
              <Input name="min_qty" type="number" step="0.01" defaultValue="0" />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button disabled={savePart.isPending}>{savePart.isPending ? "Saving…" : "Save part"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock in / out */}
      <Dialog open={!!moveFor} onOpenChange={(v) => !v && setMoveFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveFor?.kind === "OUT" ? "Issue stock" : "Receive stock"} — {moveFor?.part.part_name}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!moveFor) return;
              const fd = new FormData(e.currentTarget);
              const qty = Number(fd.get("qty"));
              if (!qty || qty <= 0) {
                toast.error("Enter a quantity");
                return;
              }
              move.mutate({
                part_id: moveFor.part.id,
                kind: moveFor.kind,
                qty,
                rate: Number(fd.get("rate")) || 0,
                remarks: String(fd.get("remarks") ?? ""),
              });
            }}
          >
            <p className="text-sm text-muted-foreground">
              In stock now: {Number(moveFor?.part.qty_on_hand ?? 0)} {moveFor?.part.unit}
            </p>
            <div>
              <Label>Quantity</Label>
              <Input name="qty" type="number" step="0.01" autoFocus />
            </div>
            <div>
              <Label>Rate</Label>
              <Input
                name="rate"
                type="number"
                step="0.01"
                defaultValue={String(
                  moveFor?.kind === "OUT" ? (moveFor?.part.sale_rate ?? 0) : (moveFor?.part.purchase_rate ?? 0),
                )}
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea name="remarks" rows={2} placeholder="Bill number, job card, supplier…" />
            </div>
            <DialogFooter>
              <Button disabled={move.isPending}>{move.isPending ? "Saving…" : "Update stock"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [results, setResults] = useState<{ row: number; ok: boolean; message: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const template = () => {
    const header = SPARE_UPLOAD_COLUMNS.map((c) => c.key);
    const sample = SPARE_UPLOAD_COLUMNS.map((c) => c.sample);
    downloadCsv("spare-parts-stock-template.csv", toCsv([header, sample]));
  };

  const run = async () => {
    setBusy(true);
    const out: { row: number; ok: boolean; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      try {
        const { error } = await supabase.rpc("upsert_spare_part_stock", {
          _part_number: String(r.part_number ?? "").trim(),
          _part_name: String(r.part_name ?? "").trim(),
          _qty: Number(r.qty ?? 0) || 0,
          _category: (r.category?.trim() || null) as string,
          _brand: (r.brand?.trim() || null) as string,
          _rack_location: (r.rack_location?.trim() || null) as string,
          _purchase_rate: Number(r.purchase_rate ?? 0) || 0,
          _sale_rate: Number(r.sale_rate ?? 0) || 0,
          _min_qty: Number(r.min_qty ?? 0) || 0,
        });
        if (error) throw error;
        out.push({ row: i + 2, ok: true, message: `${r.part_number} updated` });
      } catch (e) {
        out.push({ row: i + 2, ok: false, message: (e as Error).message });
      }
    }
    setResults(out);
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["spare-parts"] });
    const ok = out.filter((o) => o.ok).length;
    toast.success(`${ok} of ${out.length} rows loaded`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setRows([]);
          setResults([]);
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload current spare parts stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download the sheet, fill your existing stock and upload it back. Existing part numbers are updated with the
            quantity in the sheet; new part numbers are created.
          </p>
          <Button variant="outline" size="sm" onClick={template}>
            <Download className="mr-1 h-4 w-4" /> Download sheet format
          </Button>

          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            {SPARE_UPLOAD_COLUMNS.map((c) => (
              <span key={c.key} className="mr-3 inline-block">
                <span className="font-medium text-foreground">{c.key}</span> — {c.label}
                {"required" in c && c.required ? " (required)" : ""}
              </span>
            ))}
          </div>

          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const parsed = parseCsv(await file.text());
              setResults([]);
              setRows(parsed);
              if (parsed.length === 0) toast.error("No rows found in this file");
            }}
          />

          {rows.length > 0 && results.length === 0 && (
            <p className="text-sm">
              {rows.length} rows ready to upload.
            </p>
          )}

          {results.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-md border text-sm">
              {results.map((r) => (
                <div key={r.row} className="flex gap-2 border-b px-3 py-1.5 last:border-b-0">
                  <span className="w-12 text-muted-foreground">#{r.row}</span>
                  <span className={r.ok ? "text-success" : "text-destructive"}>{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={run} disabled={busy || rows.length === 0}>
            {busy ? "Uploading…" : `Upload ${rows.length || ""} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
