import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, ClipboardList, PhoneCall, Tractor, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useProfileMap } from "@/lib/queries";
import { KpiCard, PageHeader, EmptyState } from "@/components/sales/ui";
import { StatusBadge, InterestBadge } from "@/components/sales/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ALL_STATUSES, STATUS_LABEL, todayISO, fmtDate, type InquiryStatus } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Sales Dashboard — KrushiVidhya Automobiles" },
      { name: "description", content: "Today's inquiries, follow-ups, demos, bookings and alerts." },
      { property: "og:title", content: "Sales Dashboard — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership sales pipeline at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const names = useProfileMap();
  const today = todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [inq, fu, demos, bookings] = await Promise.all([
        supabase.from("inquiries").select("*, customer:customers(customer_name, mobile, village)"),
        supabase.from("followups").select("*, inquiry:inquiries(id, inquiry_number), customer:customers(customer_name, mobile)"),
        supabase.from("demos").select("*"),
        supabase.from("bookings").select("*, allocation:tractor_allocations(id), customer:customers(customer_name)"),
      ]);
      if (inq.error) throw inq.error;
      return {
        inquiries: inq.data ?? [],
        followups: fu.data ?? [],
        demos: demos.data ?? [],
        bookings: bookings.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const inquiries = data.inquiries;
  const activeInquiries = inquiries.filter((i) => !["BOOKED", "DELIVERED", "LOST"].includes(i.status));

  const newToday = inquiries.filter((i) => i.inquiry_date === today).length;
  const dueToday = activeInquiries.filter((i) => i.next_followup_date === today);
  const overdue = activeInquiries.filter((i) => i.next_followup_date && i.next_followup_date < today);
  const missingNext = activeInquiries.filter((i) => !i.next_followup_date);
  const visitsToday = data.followups.filter(
    (f) => f.followup_date === today && ["Visit", "Showroom Visit"].includes(f.contact_method),
  ).length;
  const demosToday = data.demos.filter((d) => d.demo_date === today).length;
  const bookingsToday = data.bookings.filter((b) => b.booking_date === today).length;
  const expectedDeliveries = data.bookings.filter(
    (b) => b.expected_delivery_date && b.expected_delivery_date >= today && b.status !== "DELIVERED",
  );
  const pendingAllocation = data.bookings.filter(
    (b) => (b.allocation as unknown[] | null)?.length === 0 && b.status === "BOOKED",
  );
  const hotStale = activeInquiries.filter(
    (i) => i.interest_level === "HOT" && (!i.next_followup_date || i.next_followup_date < today),
  );

  const pipeline = ALL_STATUSES.map((s) => ({
    status: s,
    count: inquiries.filter((i) => i.status === s).length,
  }));

  const bySalesman = new Map<string, { inq: number; fu: number; booked: number; delivered: number }>();
  inquiries.forEach((i) => {
    const e = bySalesman.get(i.salesman_id) ?? { inq: 0, fu: 0, booked: 0, delivered: 0 };
    e.inq += 1;
    if (i.status === "BOOKED") e.booked += 1;
    if (i.status === "DELIVERED") {
      e.booked += 1;
      e.delivered += 1;
    }
    bySalesman.set(i.salesman_id, e);
  });
  data.followups.forEach((f) => {
    const e = bySalesman.get(f.salesman_id) ?? { inq: 0, fu: 0, booked: 0, delivered: 0 };
    e.fu += 1;
    bySalesman.set(f.salesman_id, e);
  });

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
          me?.isManagement
            ? "Full dealership view — all salesmen"
            : "Your inquiries, follow-ups and bookings"
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="New inquiries" value={newToday} icon={<ClipboardList className="h-4 w-4" />} />
        <KpiCard label="Follow-ups today" value={dueToday.length} icon={<PhoneCall className="h-4 w-4" />} tone="info" />
        <KpiCard label="Overdue" value={overdue.length} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiCard label="Customer visits" value={visitsToday} />
        <KpiCard label="Demos" value={demosToday} icon={<Tractor className="h-4 w-4" />} />
        <KpiCard label="Bookings" value={bookingsToday} tone="success" />
        <KpiCard
          label="Expected deliveries"
          value={expectedDeliveries.length}
          icon={<Truck className="h-4 w-4" />}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pipeline.map((p) => (
              <Link
                key={p.status}
                to="/inquiries"
                search={{ status: p.status }}
                className="rounded-md border border-border p-3 transition-colors hover:bg-muted"
              >
                <p className="text-xs text-muted-foreground">{STATUS_LABEL[p.status as InquiryStatus]}</p>
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
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <AlertList
          title="Overdue follow-ups"
          tone="danger"
          items={overdue.map((i) => ({
            id: i.id,
            primary: `${i.inquiry_number} · ${(i.customer as { customer_name?: string } | null)?.customer_name ?? ""}`,
            secondary: `Due ${fmtDate(i.next_followup_date)} · ${i.model}`,
            status: i.status as InquiryStatus,
          }))}
        />
        <AlertList
          title="Inquiries without next follow-up date"
          tone="warning"
          items={missingNext.map((i) => ({
            id: i.id,
            primary: `${i.inquiry_number} · ${(i.customer as { customer_name?: string } | null)?.customer_name ?? ""}`,
            secondary: i.model,
            status: i.status as InquiryStatus,
          }))}
        />
        <AlertList
          title="Hot leads with no recent activity"
          tone="warning"
          items={hotStale.map((i) => ({
            id: i.id,
            primary: `${i.inquiry_number} · ${(i.customer as { customer_name?: string } | null)?.customer_name ?? ""}`,
            secondary: `${i.model} · HOT`,
            status: i.status as InquiryStatus,
          }))}
        />
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> Bookings pending tractor allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingAllocation.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing pending.</p>
            )}
            {pendingAllocation.map((b) => (
              <Link
                key={b.id}
                to="/bookings/$bookingId"
                params={{ bookingId: b.id }}
                className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="font-semibold">{b.booking_number}</span> ·{" "}
                {(b.customer as { customer_name?: string } | null)?.customer_name} · {b.tractor_model}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {me?.isManagement && (
        <section className="mt-6">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Salesman performance</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesman</TableHead>
                    <TableHead className="text-right">Inquiries</TableHead>
                    <TableHead className="text-right">Follow-ups</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Deliveries</TableHead>
                    <TableHead className="text-right">Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...bySalesman.entries()].map(([id, s]) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{names.get(id) ?? "Unknown"}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.inq}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.fu}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.booked}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.delivered}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.inq ? Math.round((s.booked / s.inq) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {bySalesman.size === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function AlertList({
  title,
  items,
  tone,
}: {
  title: string;
  tone: "danger" | "warning";
  items: { id: string; primary: string; secondary: string; status: InquiryStatus }[];
}) {
  return (
    <Card className={tone === "danger" ? "border-destructive/40 shadow-card" : "shadow-card"}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            className={`h-4 w-4 ${tone === "danger" ? "text-destructive" : "text-warning"}`}
          />
          {title}
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-64 space-y-2 overflow-y-auto">
        {items.length === 0 && <p className="text-sm text-muted-foreground">All clear.</p>}
        {items.map((i) => (
          <Link
            key={i.id}
            to="/inquiries/$inquiryId"
            params={{ inquiryId: i.id }}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{i.primary}</span>
              <span className="block truncate text-xs text-muted-foreground">{i.secondary}</span>
            </span>
            <StatusBadge status={i.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
