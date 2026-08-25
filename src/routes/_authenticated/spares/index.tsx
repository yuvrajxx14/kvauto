import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Wrench, User } from "lucide-react";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, inr } from "@/lib/sales";
import {
  SPARE_STATUSES,
  SPARE_STATUS_LABEL,
  requestedValue,
  spareStatusTone,
  useSpareRequests,
} from "@/lib/spares";

export const Route = createFileRoute("/_authenticated/spares/")({
  head: () => ({
    meta: [
      { title: "Spare Parts Requirements · KrushiVidhya Automobiles" },
      {
        name: "description",
        content:
          "Mechanics and customers raise spare parts requirements and the spare manager approves and issues the parts.",
      },
      { property: "og:title", content: "Spare Parts Requirements · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Track every spare parts demand from request to issue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SparesPage,
});

function SparesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const { data, isLoading } = useSpareRequests({ search, status });
  const rows = data ?? [];

  const pending = rows.filter((r) => r.status === "PENDING").length;
  const partial = rows.filter((r) => r.status === "PARTIAL").length;

  return (
    <div>
      <PageHeader
        title="Spare parts requirements"
        subtitle="Mechanics and customers raise a parts demand — the spare manager approves and issues it"
        actions={
          <Button asChild>
            <Link to="/spares/new">
              <Plus className="mr-1 h-4 w-4" /> New requirement
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Showing" value={String(rows.length)} />
        <Metric label="Waiting for approval" value={String(pending)} />
        <Metric label="Partially issued" value={String(partial)} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search request no, requester, mobile, model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open requirements</SelectItem>
            <SelectItem value="all">All requirements</SelectItem>
            {SPARE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SPARE_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Raised by</TableHead>
                <TableHead>Tractor</TableHead>
                <TableHead>Parts</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
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
                    No spare parts requirements here.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const items = (r.items ?? []) as { part_name: string; qty_requested: number; rate: number }[];
                return (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell>
                      <Link to="/spares/$requestId" params={{ requestId: r.id }} className="font-medium hover:underline">
                        {r.request_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {r.request_type === "MECHANIC" ? (
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm">{r.requester_name}</span>
                      </div>
                      {r.job?.job_number && <p className="text-xs text-muted-foreground">{r.job.job_number}</p>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.model || "—"}
                      {r.chassis_number && <p className="text-xs text-muted-foreground">{r.chassis_number}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{items.length}</TableCell>
                    <TableCell className="text-sm">{inr(requestedValue(items))}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={spareStatusTone(r.status)}>
                        {SPARE_STATUS_LABEL[r.status as keyof typeof SPARE_STATUS_LABEL] ?? r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
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
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
