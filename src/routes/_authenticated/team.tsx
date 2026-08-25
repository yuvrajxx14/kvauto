import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & Roles — KrushiVidhya Automobiles" },
      { name: "description", content: "Assign dealership staff roles for the sales module." },
      { property: "og:title", content: "Team & Roles — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership staff and role management." },
    ],
  }),
  component: TeamPage,
});

const ROLES = ["ceo", "manager", "salesman", "receptionist"] as const;
type Role = (typeof ROLES)[number];
const ROLE_LABEL: Record<Role, string> = {
  ceo: "CEO / Dealer",
  manager: "Manager",
  salesman: "Salesman",
  receptionist: "Receptionist",
};

function TeamPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.rpc("staff_directory" as never),
        supabase.from("user_roles").select("id, user_id, role"),
      ]);

      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return { profiles: profiles ?? [], roles: roles ?? [] };
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
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
        <PageHeader title="Team & Roles" subtitle="Dealership staff and their access levels." />
        <EmptyState title="Management access only" hint="Ask the dealer or a manager for access." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Team & Roles" subtitle="Assign an access role to each staff member." />
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading team…</p>
          ) : (data?.profiles.length ?? 0) === 0 ? (
            <EmptyState title="No staff accounts yet" hint="Staff appear here after they sign up." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Current role</TableHead>
                  <TableHead className="w-52">Assign role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.profiles.map((p) => {
                  const current = data!.roles.find((r) => r.user_id === p.id)?.role as Role | undefined;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {p.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        {current ? (
                          <Badge variant="secondary">{ROLE_LABEL[current]}</Badge>
                        ) : (
                          <Badge variant="outline">No role</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={current ?? ""}
                          onValueChange={(v) => setRole.mutate({ userId: p.id, role: v as Role })}
                          disabled={p.id === me.profile?.id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
