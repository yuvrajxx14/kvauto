import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, AlertTriangle, Clock, CheckCircle2, IndianRupee } from "lucide-react";
import { PageHeader, KpiCard, EmptyState } from "@/components/sales/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { useProfileMap } from "@/lib/queries";
import {
  useServiceJobs,
  sortServiceJobs,
  isOverdue,
  villageDemand,
  OPEN_STATUSES,
  SERVICE_STATUS_LABEL,
  PRIORITY_LABEL,
  type ServiceStatus,
  type Priority,
} from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/workshop/")({
  head: () => ({
    meta: [
      { title: "Workshop dashboard · KrushiVidhya Automobiles" },
      {
        name: "description",
        content: "Live workshop load: open job cards, priority complaints, overdue promises and pending village visits.",
      },
      { property: "og:title", content: "Workshop dashboard · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Manage the tractor workshop, service jobs and field visits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkshopDashboard,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function WorkshopDashboard() {
  const { data: me } = useMe();
  const { data: jobs, isLoading } = useServiceJobs();
  const names = useProfileMap();
  const list = jobs ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  if (me && !me.isWorkshop) {
    return (
      <div>
        <PageHeader title="Workshop" subtitle="Service department" />
        <EmptyState title="Workshop access only" hint="Ask the dealer or a manager to assign you a workshop role." />
      </div>
    );
  }

  const open = list.filter((j) => OPEN_STATUSES.includes(j.status as ServiceStatus));
  const problems = open.filter((j) => j.service_type === "PROBLEM");
  const overdue = open.filter(isOverdue);
  const completedToday = list.filter((j) => j.completed_date === today);
  const revenue = list
    .filter((j) => (j.completed_date ?? "").startsWith(month))
    .reduce((s, j) => s + Number(j.total_amount || 0), 0);
  const villages = villageDemand(list);

  return (
    <div>
      <PageHeader
        title="Workshop"
        subtitle="Service load, priority complaints and pending field visits."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/workshop/route-planner">Route planner</Link>
            </Button>
            <Button asChild>
              <Link to="/workshop/service">Service register</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Open jobs" value={open.length} icon={<Wrench className="h-4 w-4" />} />
        <KpiCard
          label="Problem jobs pending"
          value={problems.length}
          tone="danger"
          hint="Served before general service"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <KpiCard label="Overdue" value={overdue.length} tone="warning" icon={<Clock className="h-4 w-4" />} />
        <KpiCard
          label="Completed today"
          value={completedToday.length}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard label="Revenue this month" value={inr(revenue)} icon={<IndianRupee className="h-4 w-4" />} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priority queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : sortServiceJobs(open).length === 0 ? (
              <EmptyState title="No open job cards" hint="New service entries appear here." />
            ) : (
              sortServiceJobs(open)
                .slice(0, 8)
                .map((j) => (
                  <Link
                    key={j.id}
                    to="/workshop/service/$jobId"
                    params={{ jobId: j.id }}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {j.customer_name} · {j.village}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {j.job_number} · {j.model ?? "—"} · {j.complaint ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {j.service_type === "PROBLEM" && (
                        <Badge variant="destructive">{j.problem_category ?? "Problem"}</Badge>
                      )}
                      <Badge variant="outline">{PRIORITY_LABEL[j.priority as Priority] ?? j.priority}</Badge>
                    </div>
                  </Link>
                ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending field visits by village</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {villages.length === 0 ? (
              <EmptyState title="No field visits pending" hint="Field-visit jobs group by village here." />
            ) : (
              villages.slice(0, 8).map((v) => (
                <div
                  key={v.village}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{v.village}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.total} pending · oldest {v.days} day{v.days === 1 ? "" : "s"}
                    </p>
                  </div>
                  {v.problems > 0 && <Badge variant="destructive">{v.problems} problem</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overdue promises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.length === 0 ? (
              <EmptyState title="Nothing overdue" hint="All promised dates are on track." />
            ) : (
              sortServiceJobs(overdue).map((j) => (
                <Link
                  key={j.id}
                  to="/workshop/service/$jobId"
                  params={{ jobId: j.id }}
                  className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {j.customer_name} · {j.job_number}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Promised {j.promised_date} · {names.get(j.assigned_to ?? "") ?? "Unassigned"}
                    </p>
                  </div>
                  <Badge variant="outline">{SERVICE_STATUS_LABEL[j.status as ServiceStatus] ?? j.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
