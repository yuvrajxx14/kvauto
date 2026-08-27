import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe, ROLE_LABELS, ASSIGNABLE_ROLES, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/users/")({
  head: () => ({
    meta: [
      { title: "User master · KrushiVidhya Automobiles" },
      { name: "description", content: "Manage dealership staff accounts, contact details and access roles." },
      { property: "og:title", content: "User master · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Staff accounts and access roles for the dealership ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

type StaffRow = { id: string; full_name: string; email: string | null; phone: string | null };

function UsersPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["user-master"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.rpc("staff_directory" as never),
        supabase.from("user_roles").select("id, user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return {
        profiles: ((profiles ?? []) as unknown as StaffRow[]).sort((a, b) =>
          (a.full_name ?? "").localeCompare(b.full_name ?? ""),
        ),
        roles: roles ?? [],
      };
    },
    enabled: !!me?.isManagement,
  });

  const saveProfile = useMutation({
    mutationFn: async (p: { id: string; full_name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: p.full_name, phone: p.phone || null })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff details updated");
      setEditing(null);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me?.isManagement) {
    return (
      <div>
        <PageHeader title="User master" subtitle="Dealership staff accounts and access roles." />
        <EmptyState title="Management access only" hint="Ask the dealer or a manager for access." />
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const list = (data?.profiles ?? []).filter(
    (p) =>
      !term ||
      (p.full_name ?? "").toLowerCase().includes(term) ||
      (p.email ?? "").toLowerCase().includes(term) ||
      (p.phone ?? "").toLowerCase().includes(term),
  );

  return (
    <div>
      <PageHeader
        title="User master"
        subtitle="Staff accounts, contact details and access roles"
      />

      <div className="mb-3 max-w-xs">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading staff…</p>
          ) : list.length === 0 ? (
            <EmptyState title="No staff accounts yet" hint="Staff appear here after they sign up." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-52">Assign role</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const current = data!.roles.find((r) => r.user_id === p.id)?.role as AppRole | undefined;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{p.email ?? "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{p.phone ?? "—"}</TableCell>
                      <TableCell>
                        {current ? (
                          <Badge variant="secondary">{ROLE_LABELS[current]}</Badge>
                        ) : (
                          <Badge variant="outline">No role</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={current ?? ""}
                          onValueChange={(v) => setRole.mutate({ userId: p.id, role: v as AppRole })}
                          disabled={p.id === me.profile?.id}
                        >
                          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit staff details</DialogTitle></DialogHeader>
          {editing && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const full_name = String(fd.get("full_name") ?? "").trim();
                if (!full_name) { toast.error("Name is required"); return; }
                saveProfile.mutate({ id: editing.id, full_name, phone: String(fd.get("phone") ?? "").trim() });
              }}
            >
              <div>
                <Label>Full name</Label>
                <Input name="full_name" defaultValue={editing.full_name ?? ""} maxLength={80} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" defaultValue={editing.phone ?? ""} maxLength={20} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editing.email ?? "—"} disabled />
              </div>
              <DialogFooter>
                <Button disabled={saveProfile.isPending}>{saveProfile.isPending ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
