import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles } from "@/lib/queries";
import { useMe } from "@/lib/auth";
import { fmtDate } from "@/lib/sales";
import {
  SERVICE_MODE_LABEL,
  SERVICE_STATUS_LABEL,
  seedServiceChecklist,
  useServiceJobs,
  type ServiceStatus,
} from "@/lib/service";
import { statusTone } from "./index";

export const Route = createFileRoute("/_authenticated/service/jobcards")({
  head: () => ({
    meta: [
      { title: "Job Cards & Mechanic Assignment · KrushiVidhya Automobiles" },
      { name: "description", content: "Managers assign mechanics and open job cards for registered tractor service complaints." },
      { property: "og:title", content: "Job Cards & Mechanic Assignment · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Assign a mechanic, open the job card and track work to completion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobCardsPage,
});

function JobCardsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useServiceJobs({ search, status: "active" });
  const { data: staff } = useProfiles();
  const { data: me } = useMe();
  const canAssign = !!me?.isManagement;

  const rows = data ?? [];
  const unassigned = rows.filter((r) => !r.assigned_to);
  const assigned = rows.filter((r) => r.assigned_to);

  const assign = useMutation({
    mutationFn: async ({ jobId, mechanicId }: { jobId: string; mechanicId: string | null }) => {
      const { error } = await supabase
        .from("service_jobs")
        .update({
          assigned_to: mechanicId,
          ...(mechanicId ? { status: "ASSIGNED" } : {}),
        } as never)
        .eq("id", jobId);
      if (error) throw error;
      if (mechanicId) await seedServiceChecklist(jobId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
      toast.success("Job card updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const MechanicSelect = ({ jobId, value }: { jobId: string; value: string | null }) => (
    <Select
      value={value ?? "none"}
      disabled={!canAssign || assign.isPending}
      onValueChange={(v) => assign.mutate({ jobId, mechanicId: v === "none" ? null : v })}
    >
      <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Assign mechanic" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {(staff ?? []).map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <PageHeader
        title="Job cards"
        subtitle="Managers assign a mechanic here — the mechanic then works the job card to completion"
      />

      {!canAssign && (
        <p className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Only managers can assign mechanics. You can still open a job card and record the work you did.
        </p>
      )}

      <div className="relative mb-3 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search job no, customer, mobile, chassis"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="mb-4 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            Waiting for a mechanic <span className="text-sm font-normal text-muted-foreground">({unassigned.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JobTable
            rows={unassigned}
            isLoading={isLoading}
            empty="Every registered complaint has a mechanic."
            renderMechanic={(j) => <MechanicSelect jobId={j.id} value={j.assigned_to} />}
          />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            In the workshop <span className="text-sm font-normal text-muted-foreground">({assigned.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JobTable
            rows={assigned}
            isLoading={isLoading}
            empty="No jobs assigned yet."
            renderMechanic={(j) => <MechanicSelect jobId={j.id} value={j.assigned_to} />}
          />
        </CardContent>
      </Card>
    </div>
  );
}

type Row = {
  id: string;
  job_number: string;
  customer_name: string;
  mobile: string;
  village: string;
  model: string | null;
  registration_number: string | null;
  chassis_number: string | null;
  service_mode: string;
  received_date: string;
  promised_date: string | null;
  status: string;
  assigned_to: string | null;
};

function JobTable({
  rows,
  isLoading,
  empty,
  renderMechanic,
}: {
  rows: Row[];
  isLoading: boolean;
  empty: string;
  renderMechanic: (j: Row) => React.ReactNode;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Tractor</TableHead>
          <TableHead>Mechanic</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
        )}
        {!isLoading && rows.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">{empty}</TableCell></TableRow>
        )}
        {rows.map((j) => (
          <TableRow key={j.id}>
            <TableCell className="font-medium">
              {j.job_number}
              <p className="text-xs text-muted-foreground">
                {fmtDate(j.received_date)} · {SERVICE_MODE_LABEL[j.service_mode] ?? j.service_mode}
              </p>
            </TableCell>
            <TableCell>
              <p>{j.customer_name}</p>
              <p className="text-xs text-muted-foreground">{j.mobile} · {j.village}</p>
            </TableCell>
            <TableCell>
              <p>{j.model ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{j.registration_number ?? j.chassis_number ?? ""}</p>
            </TableCell>
            <TableCell>{renderMechanic(j)}</TableCell>
            <TableCell>
              <Badge variant="secondary" className={statusTone(j.status as ServiceStatus)}>
                {SERVICE_STATUS_LABEL[j.status as ServiceStatus] ?? j.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <Link to="/service/$jobId" params={{ jobId: j.id }}>Open job card</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
