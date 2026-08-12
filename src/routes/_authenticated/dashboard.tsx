import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, CalendarClock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { KpiCard, PageHeader, EmptyState } from "@/components/sales/ui";
import { StatusBadge } from "@/components/sales/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_STATUSES, STATUS_LABEL, todayISO, fmtDate, type InquiryStatus } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Sales Dashboard — KrushiVidhya Automobiles" },
      { name: "description", content: "Inquiry pipeline, follow-up dates and model demand at a glance." },
      { property: "og:title", content: "Sales Dashboard — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership inquiry pipeline at a glance." },
    ],
  }),
  component: Dashboard,
});

type DashInquiry = {
  id: string;
  inquiry_number: string;
  inquiry_date: string;
  model: string;
  status: string;
  next_followup_date: string | null;
  customer: { customer_name?: string; mobile?: string; village?: string } | null;
};

function Dashboard() {
  const { data: me } = useMe();
  const today = todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select(
          "id, inquiry_number, inquiry_date, model, status, next_followup_date, customer:customers(customer_name, mobile, village)",
        )
        .order("inquiry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DashInquiry[];
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const inquiries = data;
  const active = inquiries.filter((i) => !["BOOKED", "DELIVERED", "LOST"].includes(i.status));
  const newToday = inquiries.filter((i) => i.inquiry_date === today).length;
  const dueToday = active.filter((i) => i.next_followup_date === today);
  const overdue = active.filter((i) => i.next_followup_date && i.next_followup_date < today);
  const missingNext = active.filter((i) => !i.next_followup_date);

  const pipeline = ALL_STATUSES.map((s) => ({
    status: s,
    count: inquiries.filter((i) => i.status === s).length,
  }));

  const modelDemand = Object.entries(
    inquiries.reduce<Record<string, number>>((acc, i) => {
      acc[i.model] = (acc[i.model] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Sales Dashboard"
        subtitle={
          me?.isManagement ? "Full dealership view — all salesmen" : "Your inquiries and follow-ups"
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="New inquiries today" value={newToday} icon={<ClipboardList className="h-4 w-4" />} />
        <KpiCard label="Active inquiries" value={active.length} icon={<Users className="h-4 w-4" />} tone="info" />
        <KpiCard label="Follow-ups today" value={dueToday.length} icon={<CalendarClock className="h-4 w-4" />} />
        <KpiCard
          label="Overdue follow-ups"
          value={overdue.length}
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inquiry pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {pipeline.map((p) => (
              <Link
                key={p.status}
                to="/inquiries"
                search={{ status: p.status }}
                className="rounded-md border border-border p-3 transition-colors hover:bg-muted"
              >
                <p className="text-xs text-muted-foreground">{STATUS_LABEL[p.status]}</p>
                <p className="text-2xl font-bold tabular-nums">{p.count}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model-wise demand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {modelDemand.length === 0 && <EmptyState title="No inquiries yet" />}
            {modelDemand.map(([model, count]) => {
              const max = modelDemand[0]![1];
              return (
                <div key={model}>
                  <div className="flex justify-between text-xs">
                    <span className="truncate font-medium">{model}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <AlertList title="Overdue follow-ups" items={overdue} today={today} tone="danger" />
        <AlertList title="Due today" items={dueToday} today={today} />
        <AlertList title="No follow-up date set" items={missingNext} today={today} tone="warning" />
      </section>
    </div>
  );
}

function AlertList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: DashInquiry[];
  today: string;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${toneClass}`}>
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
        {items.slice(0, 8).map((i) => (
          <Link
            key={i.id}
            to="/inquiries/$inquiryId"
            params={{ inquiryId: i.id }}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{i.customer?.customer_name ?? "—"}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {i.inquiry_number} · {i.model}
                {i.next_followup_date ? ` · ${fmtDate(i.next_followup_date)}` : ""}
              </span>
            </span>
            <StatusBadge status={i.status as InquiryStatus} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
