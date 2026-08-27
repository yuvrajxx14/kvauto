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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVillages, type Village } from "@/lib/erp";
import { TEHSILS } from "@/lib/geo";
import { useMe } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/villages/")({
  head: () => ({
    meta: [
      { title: "Village & tehsil master · KrushiVidhya Automobiles" },
      { name: "description", content: "Manage the villages served by the dealership and the tehsil each village belongs to." },
      { property: "og:title", content: "Village & tehsil master · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Village and tehsil master for dealership customer records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VillagesPage,
});

function VillagesPage() {
  const { data: me } = useMe();
  const canEdit = !!me?.isManagement;
  const { data: villages, isLoading } = useVillages();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Village | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tehsil, setTehsil] = useState("Jasdan");

  const save = useMutation({
    mutationFn: async (v: { id?: string; name: string; tehsil: string }) => {
      if (v.id) {
        const { error } = await supabase.from("villages").update({ name: v.name, tehsil: v.tehsil }).eq("id", v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("villages").insert({ name: v.name, tehsil: v.tehsil });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Village saved");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["villages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (v: { id: string; active: boolean }) => {
      const { error } = await supabase.from("villages").update({ active: v.active }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["villages"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const list = (villages ?? []).filter(
    (v) => !term || v.name.toLowerCase().includes(term) || v.tehsil.toLowerCase().includes(term),
  );

  return (
    <div>
      <PageHeader
        title="Village & tehsil master"
        subtitle="Villages served by the dealership — tehsil auto-fills from this list"
        actions={
          canEdit ? (
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) setEditing(null);
                if (v) setTehsil(editing?.tehsil ?? "Jasdan");
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add village</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Edit village" : "Add village"}</DialogTitle></DialogHeader>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = String(fd.get("name") ?? "").trim();
                    if (!name) { toast.error("Village name is required"); return; }
                    save.mutate({ ...(editing ? { id: editing.id } : {}), name, tehsil });
                  }}
                >
                  <div>
                    <Label>Village name</Label>
                    <Input name="name" defaultValue={editing?.name ?? ""} maxLength={80} required />
                  </div>
                  <div>
                    <Label>Tehsil</Label>
                    <Select value={tehsil} onValueChange={setTehsil}>
                      <SelectTrigger><SelectValue placeholder="Select tehsil" /></SelectTrigger>
                      <SelectContent>
                        {TEHSILS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="mb-3 max-w-xs">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search village or tehsil…" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Village</TableHead>
                <TableHead>Tehsil</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && list.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No villages found.</TableCell></TableRow>
              )}
              {list.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.tehsil}</TableCell>
                  <TableCell>
                    {v.active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Switch checked={v.active} onCheckedChange={(val) => toggle.mutate({ id: v.id, active: val })} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditing(v); setTehsil(v.tehsil); setOpen(true); }}
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
