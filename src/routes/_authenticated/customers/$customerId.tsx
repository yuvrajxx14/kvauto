import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { StatusBadge, BookingBadge } from "@/components/sales/badges";
import { DocumentsPanel } from "@/components/sales/documents-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, inr, type InquiryStatus } from "@/lib/sales";
import type { BookingStatus } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer Profile — KrushiVidhya Automobiles" },
      { name: "description", content: "Customer profile with tractors owned, payments, subsidy and passing status." },
      { property: "og:title", content: "Customer Profile — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership customer profile." },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-360", customerId],
    queryFn: async () => {
      const [c, i, b, p, s, pass] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase.from("inquiries").select("*").eq("customer_id", customerId).order("inquiry_date", { ascending: false }),
        supabase
          .from("bookings")
          .select(
            "*, allocation:tractor_allocations(*, stock:tractor_stock(*)), delivery:deliveries(*)",
          )
          .eq("customer_id", customerId)
          .order("booking_date", { ascending: false }),
        supabase
          .from("booking_payments")
          .select("*, booking:bookings!inner(id, booking_number, customer_id)")
          .eq("booking.customer_id", customerId)
          .order("payment_date", { ascending: false }),
        supabase.from("subsidy_cases").select("*").eq("customer_id", customerId),
        supabase.from("passing_records").select("*").eq("customer_id", customerId),
      ]);
      if (c.error) throw c.error;
      return {
        customer: c.data,
        inquiries: i.data ?? [],
        bookings: b.data ?? [],
        payments: p.data ?? [],
        subsidy: s.data ?? [],
        passing: pass.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const c = data.customer;
  const delivered = data.bookings.filter((b) => b.status === "DELIVERED");
  const active = data.bookings.filter((b) => !["DELIVERED", "CANCELLED"].includes(b.status));
  const openInquiries = data.inquiries.filter((i) => !["DELIVERED", "LOST"].includes(i.status));
  const outstanding = data.bookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce(
      (sum, b) =>
        sum + Math.max(0, Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0)),
      0,
    );

  return (
    <div>
      <PageHeader
        title={c.customer_name}
        subtitle={`${c.mobile} · ${c.village}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/accounting/$customerId" params={{ customerId }}>
                Customer ledger
              </Link>
            </Button>
            <DeleteRecordButton table="customers" id={customerId} label="this customer" redirectTo="/customers" />
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Tractors owned" value={String(delivered.length)} />
        <Metric label="Active bookings" value={String(active.length)} />
        <Metric label="Open inquiries" value={String(openInquiries.length)} />
        <Metric label="Outstanding" value={inr(outstanding)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Field label="Mobile">{c.mobile ?? "—"}</Field>
            <Field label="Alternate mobile">{c.alternate_mobile ?? "—"}</Field>
            <Field label="Village">{c.village ?? "—"}</Field>
            <Field label="Taluka">{c.taluka ?? "—"}</Field>
            <Field label="District">{c.district ?? "—"}</Field>
            <Field label="Address">{c.address ?? "—"}</Field>
            <Field label="Customer type">{c.customer_type ?? "—"}</Field>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tractors &amp; bookings ({data.bookings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.bookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            {data.bookings.map((b) => {
              const alloc = Array.isArray(b.allocation) ? b.allocation[0] : b.allocation;
              const delivery = Array.isArray(b.delivery) ? b.delivery[0] : b.delivery;
              const sc = data.subsidy.find((s) => s.booking_id === b.id);
              const pr = data.passing.find((p) => p.booking_id === b.id);
              const due = Math.max(
                0,
                Number(b.final_price ?? 0) + Number(b.extra_charges ?? 0) - Number(b.amount_received ?? 0),
              );
              return (
                <div key={b.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to="/bookings/$bookingId"
                      params={{ bookingId: b.id }}
                      className="font-medium hover:underline"
                    >
                      {b.booking_number} · {b.tractor_model}
                    </Link>
                    <BookingBadge status={b.status as BookingStatus} />
                  </div>
                  <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    <Field label="Chassis">{alloc?.chassis_number ?? "—"}</Field>
                    <Field label="Engine">{alloc?.engine_number ?? "—"}</Field>
                    <Field label="Delivered on">{delivery ? fmtDate(delivery.delivery_date) : "Not delivered"}</Field>
                    <Field label="Outstanding">{inr(due)}</Field>
                    <Field label="Use type">{delivery?.use_type ?? "—"}</Field>
                    <Field label="RTO number">{pr?.rto_number ?? "—"}</Field>
                    <Field label="Number plate">{pr?.number_plate_number ?? "—"}</Field>
                    <Field label="Passing done on">{pr?.passing_date ? fmtDate(pr.passing_date) : "—"}</Field>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sc && (
                      <Badge variant={sc.approval_status === "APPROVED" ? "secondary" : "destructive"}>
                        Subsidy: {sc.application_status === "DONE" ? "applied" : "application pending"} ·{" "}
                        {sc.approval_status === "APPROVED" ? "approved" : "approval pending"}
                      </Badge>
                    )}
                    {delivery && (
                      <Badge variant={pr?.rto_number ? "secondary" : "destructive"}>
                        {pr?.rto_number ? "Passing complete" : "Passing pending"}
                      </Badge>
                    )}
                    {due > 0 && <Badge variant="destructive">Payment pending</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {delivery && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/passing/$bookingId" params={{ bookingId: b.id }}>
                          Passing file
                        </Link>
                      </Button>
                    )}
                    {sc && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/subsidy">Subsidy tracking</Link>
                      </Button>
                    )}
                    {!delivery && b.status !== "CANCELLED" && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/delivery/$bookingId" params={{ bookingId: b.id }}>
                          Delivery
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payments ({data.payments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
            {data.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  {fmtDate(p.payment_date)} · {p.payment_mode} ·{" "}
                  <span className="text-muted-foreground">{p.booking?.booking_number}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{inr(p.amount)}</span>
                  <Link
                    to="/print/receipt/$paymentId"
                    params={{ paymentId: p.id }}
                    target="_blank"
                    className="text-xs text-primary hover:underline"
                  >
                    Receipt
                  </Link>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DocumentsPanel customerId={customerId} />
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inquiry history ({data.inquiries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.inquiries.length === 0 && <p className="text-sm text-muted-foreground">No inquiries recorded.</p>}
            {data.inquiries.map((i) => (
              <Link
                key={i.id}
                to="/inquiries/$inquiryId"
                params={{ inquiryId: i.id }}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-mono text-xs">{i.inquiry_number}</span> · {i.model} · {fmtDate(i.inquiry_date)}
                </span>
                <StatusBadge status={i.status as InquiryStatus} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
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
