import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/sales";
import {
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  SERVICE_MODE_LABEL,
  SERVICE_TYPE_LABEL,
  useServiceJobs,
  type ServiceStatus,
} from "@/lib/service";

export const Route = createFileRoute("/_authenticated/service/")({
  head: () => ({
    meta: [
      { title: "Service & Problem Register · KrushiVidhya Automobiles" },
      { name: "description", content: "Register tractor service requests and breakdown complaints received at the KrushiVidhya Automobiles showroom." },
      { property: "og:title", content: "Service & Problem Register · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Every service request and complaint recorded by showroom staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceRegisterPage,
});

export function statusTone(status: ServiceStatus) {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
      return "bg-success/15 text-success";
    case "CANCELLED":
      return "bg-destructive/10 text-destructive";
    case "WAITING_PARTS":
      return "bg-warning/15 text-warning";
    case "IN_PROGRESS":
      return "bg-primary/15 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ServiceRegisterPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const { data, isLoading } = useServiceJobs({ search, status });
  const rows = data ?? [];

  const unassigned = rows.filter((r) => !r.assigned_to).length;
  const field = rows.filter((r) => r.service_mode === "FIELD_VISIT").length;

  return (
    <div>
      <PageHeader
        title="Service & problem register"
        subtitle="Anyone in the showroom can register a service request or breakdown complaint here"
        actions={
          <Button asChild>
            <Link to="/service/new">
              <Plus className="mr-1 h-4 w-4" /> Register service
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Showing" value={String(rows.length)} />
        <Metric label="Waiting for mechanic" value={String(unassigned)} />
        <Metric label="Field visits" value={String(field)} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search job no, customer, mobile, chassis"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active entries</SelectItem>
            <SelectItem value="all">All entries</SelectItem>
            {SERVICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{SERVICE_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tractor</TableHead>
                <TableHead>Complaint</TableHead>
                <TableHead>Mechanic</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Nothing registered yet.</TableCell></TableRow>
              )}
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">
                    <Link to="/service/$jobId" params={{ jobId: j.id }} className="hover:underline">
                      {j.job_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(j.received_date)} · {SERVICE_TYPE_LABEL[j.service_type] ?? j.service_type}
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
                  <TableCell className="max-w-64 text-sm">
                    <p className="truncate">{j.complaint ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{SERVICE_MODE_LABEL[j.service_mode] ?? j.service_mode}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {j.technician?.full_name ?? <span className="text-muted-foreground">Not assigned</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusTone(j.status as ServiceStatus)}>
                      {SERVICE_STATUS_LABEL[j.status as ServiceStatus] ?? j.status}
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
