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
      { title: "Service Jobs · KrushiVidhya Automobiles" },
      { name: "description", content: "Workshop service job cards, technician assignment and job status for KrushiVidhya Automobiles." },
      { property: "og:title", content: "Service Jobs · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Track tractor service jobs from open to delivered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceListPage,
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

function ServiceListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const { data, isLoading } = useServiceJobs({ search, status });
  const rows = data ?? [];

  const count = (s: ServiceStatus) => rows.filter((r) => r.status === s).length;

  return (
    <div>
      <PageHeader
        title="Service jobs"
        subtitle="Workshop & field service job cards"
        actions={
          <Button asChild>
            <Link to="/service/new">
              <Plus className="mr-1 h-4 w-4" /> New job card
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Showing" value={String(rows.length)} />
        <Metric label="Open" value={String(count("OPEN"))} />
        <Metric label="In progress" value={String(count("IN_PROGRESS"))} />
        <Metric label="Waiting parts" value={String(count("WAITING_PARTS"))} />
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
            <SelectItem value="active">Active jobs</SelectItem>
            <SelectItem value="all">All jobs</SelectItem>
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
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tractor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No service jobs yet.</TableCell></TableRow>
              )}
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">
                    <Link to="/service/$jobId" params={{ jobId: j.id }} className="hover:underline">
                      {j.job_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">{fmtDate(j.received_date)}</p>
                  </TableCell>
                  <TableCell>
                    <p>{j.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{j.mobile} · {j.village}</p>
                  </TableCell>
                  <TableCell>
                    <p>{j.model ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{j.registration_number ?? j.chassis_number ?? ""}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {SERVICE_TYPE_LABEL[j.service_type] ?? j.service_type}
                    <p className="text-xs text-muted-foreground">{SERVICE_MODE_LABEL[j.service_mode] ?? j.service_mode}</p>
                  </TableCell>
                  <TableCell className="text-sm">{j.technician?.full_name ?? "Unassigned"}</TableCell>
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
