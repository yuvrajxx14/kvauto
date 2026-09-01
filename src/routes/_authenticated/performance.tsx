import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Award, CalendarClock, IndianRupee, TrendingUp } from "lucide-react";
import { PageHeader, EmptyState, KpiCard } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePerms } from "@/lib/permissions";
import { DEPARTMENT_LABEL, fmtMinutes, monthLabel, monthStart, useTeamPerformance } from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Staff performance · KrushiVidhya Automobiles" },
      { name: "description", content: "Manager view of every staff member's bookings, deliveries, service jobs and attendance for the month." },
      { property: "og:title", content: "Staff performance · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Measure dealership staff output and attendance month by month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  const perms = usePerms();
  const [month, setMonth] = useState(monthStart());
  const { data: rows = [], isLoading } = useTeamPerformance(month);

  if (!perms.can("hr.view")) {
    return <EmptyState title="Manager access required" hint="Ask management to grant HR access to view staff performance." />;
  }

  const totals = rows.reduce(
    (acc, r) => ({
      bookings: acc.bookings + r.bookings,
      deliveries: acc.deliveries + r.deliveries,
      service: acc.service + r.serviceJobs,
      late: acc.late + r.lateDays,
    }),
    { bookings: 0, deliveries: 0, service: 0, late: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Staff performance"
        subtitle="Bookings, deliveries, service jobs and attendance for every employee"
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="perf-month" className="sr-only">Month</Label>
            <Input
              id="perf-month"
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              className="w-40"
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="Bookings" value={totals.bookings} hint={monthLabel(month)} icon={<IndianRupee className="h-4 w-4" />} tone="info" />
        <KpiCard label="Deliveries" value={totals.deliveries} hint="Completed handovers" icon={<TrendingUp className="h-4 w-4" />} tone="success" />
        <KpiCard label="Service jobs" value={totals.service} hint="Assigned this month" icon={<Award className="h-4 w-4" />} />
        <KpiCard label="Late punches" value={totals.late} hint="After 8:30 AM" icon={<CalendarClock className="h-4 w-4" />} tone="warning" />
      </div>

      <Card className="mt-5 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team scorecard · {monthLabel(month)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3">Employee</th>
                  <th className="p-3">Inquiries</th>
                  <th className="p-3">Bookings</th>
                  <th className="p-3">Deliveries</th>
                  <th className="p-3">Service (closed)</th>
                  <th className="p-3">Present days</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Punctuality</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td className="p-4" colSpan={8}>Loading team performance…</td></tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td className="p-4" colSpan={8}>
                      <EmptyState title="No employees yet" hint="Add staff in HR to measure performance." />
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.employee.id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{r.employee.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.employee.employee_code} · {DEPARTMENT_LABEL[r.employee.department] ?? r.employee.department}
                      </p>
                    </td>
                    <td className="p-3">{r.inquiries}</td>
                    <td className="p-3 font-medium">{r.bookings}</td>
                    <td className="p-3">{r.deliveries}</td>
                    <td className="p-3">{r.serviceJobs} ({r.serviceClosed})</td>
                    <td className="p-3">{r.presentDays.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                    <td className="p-3">{fmtMinutes(r.workMinutes)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{r.earlyDays} early</Badge>
                        {r.lateDays > 0 && <Badge variant="destructive">{r.lateDays} late</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Punctuality follows the payroll rule: punch-in before 8:30 AM earns ₹50 for the day, after 8:30 AM deducts ₹50.
      </p>
    </div>
  );
}
