import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useImplementProducts, IMPLEMENT_CATEGORIES, type ImplementProduct } from "@/lib/implements";
import { usePerms } from "@/lib/permissions";
import { inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/implements/products")({
  head: () => ({
    meta: [
      { title: "Implement Master · KrushiVidhya Automobiles" },
      { name: "description", content: "Manage the implements the dealership sells: rotavator, cultivator, trolley and more." },
      { property: "og:title", content: "Implement Master · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Manage the implement catalogue and standard prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImplementMasterPage,
});

function ImplementMasterPage() {
  const perms = usePerms();
  const canEdit = perms.isManagement;
  const qc = useQueryClient();
  const { data, isLoading } = useImplementProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ImplementProduct | null>(null);
  const [category, setCategory] = useState<string>(IMPLEMENT_CATEGORIES[0]);

  const save = useMutation({
    mutationFn: async (p: {
      id?: string; name: string; category: string; brand: string; size_spec: string; suitable_hp: string; default_price: number;
    }) => {
      const row = {
        name: p.name,
        category: p.category || null,
        brand: p.brand || null,
        size_spec: p.size_spec || null,
        suitable_hp: p.suitable_hp || null,
        default_price: p.default_price,
      };
      const { error } = p.id
        ? await supabase.from("implement_products").update(row).eq("id", p.id)
        : await supabase.from("implement_products").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Implement saved");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["implement-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (p: { id: string; active: boolean }) => {
      const { error } = await supabase.from("implement_products").update({ active: p.active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["implement-products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data ?? [];

  return (
    <div>
      <PageHeader
        title="Implement master"
        subtitle="Implements available for stock and sales"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/implements"><ArrowLeft className="mr-1 h-4 w-4" /> Implement sales</Link>
            </Button>
            {canEdit && (
              <Dialog
                open={open}
                onOpenChange={(v) => {
                  setOpen(v);
                  if (!v) setEditing(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add implement</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editing ? "Edit implement" : "Add implement"}</DialogTitle></DialogHeader>
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const name = String(fd.get("name") ?? "").trim();
                      if (!name) { toast.error("Name is required"); return; }
                      save.mutate({
                        ...(editing ? { id: editing.id } : {}),
                        name,
                        category,
                        brand: String(fd.get("brand") ?? "").trim(),
                        size_spec: String(fd.get("size_spec") ?? "").trim(),
                        suitable_hp: String(fd.get("suitable_hp") ?? "").trim(),
                        default_price: Number(fd.get("default_price") ?? 0) || 0,
                      });
                    }}
                  >
                    <div><Label>Name</Label><Input name="name" defaultValue={editing?.name ?? ""} maxLength={80} required /></div>
                    <div>
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{IMPLEMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Brand</Label><Input name="brand" defaultValue={editing?.brand ?? ""} maxLength={60} /></div>
                    <div><Label>Size / specification</Label><Input name="size_spec" defaultValue={editing?.size_spec ?? ""} placeholder="e.g. 6 feet, 9 tyne" maxLength={60} /></div>
                    <div><Label>Suitable tractor HP</Label><Input name="suitable_hp" defaultValue={editing?.suitable_hp ?? ""} placeholder="e.g. 40-50 HP" maxLength={40} /></div>
                    <div><Label>Standard price</Label><Input name="default_price" type="number" min="0" step="0.01" defaultValue={String(editing?.default_price ?? 0)} /></div>
                    <DialogFooter><Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Implement</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Suitable HP</TableHead>
                <TableHead className="text-right">Standard price</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && list.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No implements yet.</TableCell></TableRow>
              )}
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category ?? "—"}</TableCell>
                  <TableCell>{p.size_spec ?? "—"}</TableCell>
                  <TableCell>{p.suitable_hp ?? "—"}</TableCell>
                  <TableCell className="text-right">{p.default_price ? inr(p.default_price) : "—"}</TableCell>
                  <TableCell>{p.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} />
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setCategory(p.category ?? IMPLEMENT_CATEGORIES[0]); setOpen(true); }}>
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
