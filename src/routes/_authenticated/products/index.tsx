import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useProducts, type Product } from "@/lib/erp";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/products/")({
  head: () => ({
    meta: [
      { title: "Product master · KrushiVidhya Automobiles" },
      { name: "description", content: "Manage the Mahindra tractor models available for inquiries, bookings and stock." },
      { property: "og:title", content: "Product master · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Manage tractor models available across the dealership." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data: me } = useMe();
  const canEdit = !!me?.isManagement;
  const { data: products, isLoading } = useProducts();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (p: { id?: string; model: string; hp: string; category: string; sort_order: number }) => {
      if (p.id) {
        const { error } = await supabase
          .from("products")
          .update({ model: p.model, hp: p.hp || null, category: p.category || null, sort_order: p.sort_order })
          .eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("products")
          .insert({ model: p.model, hp: p.hp || null, category: p.category || null, sort_order: p.sort_order });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Product saved");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (p: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active: p.active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = products ?? [];

  return (
    <div>
      <PageHeader
        title="Product master"
        subtitle="Tractor models used across inquiries, bookings and stock"
        actions={
          canEdit ? (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add model</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Edit model" : "Add model"}</DialogTitle></DialogHeader>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const model = String(fd.get("model") ?? "").trim();
                    if (!model) { toast.error("Model name is required"); return; }
                    save.mutate({
                      ...(editing ? { id: editing.id } : {}),
                      model,
                      hp: String(fd.get("hp") ?? "").trim(),
                      category: String(fd.get("category") ?? "").trim(),
                      sort_order: Number(fd.get("sort_order") ?? 0) || 0,
                    });
                  }}
                >
                  <div><Label>Model</Label><Input name="model" defaultValue={editing?.model ?? ""} maxLength={80} required /></div>
                  <div><Label>HP</Label><Input name="hp" defaultValue={editing?.hp ?? ""} maxLength={20} placeholder="e.g. 45 HP" /></div>
                  <div><Label>Category</Label><Input name="category" defaultValue={editing?.category ?? ""} maxLength={40} placeholder="YUVO / JIVO / OJA…" /></div>
                  <div><Label>Sort order</Label><Input name="sort_order" type="number" defaultValue={String(editing?.sort_order ?? list.length + 1)} /></div>
                  <DialogFooter>
                    <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>HP</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && list.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No products yet.</TableCell></TableRow>
              )}
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.model}</TableCell>
                  <TableCell>{p.hp ?? "—"}</TableCell>
                  <TableCell>{p.category ?? "—"}</TableCell>
                  <TableCell>
                    {p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditing(p); setOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
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
    </div>
  );
}
