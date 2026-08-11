import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Field } from "@/components/sales/ui";
import { StatusBadge } from "@/components/sales/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, type InquiryStatus } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer Profile — KrushiVidhya Automobiles" },
      { name: "description", content: "Customer profile with full inquiry and purchase history." },
      { property: "og:title", content: "Customer Profile — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership customer profile." },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const [c, i] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).single(),
        supabase
          .from("inquiries")
          .select("*")
          .eq("customer_id", customerId)
          .order("inquiry_date", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      return { customer: c.data, inquiries: i.data ?? [] };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const c = data.customer;

  return (
    <div>
      <PageHeader title={c.customer_name} subtitle={`${c.mobile} · ${c.village}`} />
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
            <CardTitle className="text-base">Inquiry history ({data.inquiries.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.inquiries.length === 0 && (
              <p className="text-sm text-muted-foreground">No inquiries recorded.</p>
            )}
            {data.inquiries.map((i) => (
              <Link
                key={i.id}
                to="/inquiries/$inquiryId"
                params={{ inquiryId: i.id }}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-mono text-xs">{i.inquiry_number}</span> · {i.model} ·{" "}
                  {fmtDate(i.inquiry_date)}
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
