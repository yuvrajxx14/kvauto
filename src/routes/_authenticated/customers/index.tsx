import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — KrushiVidhya Automobiles" },
      { name: "description", content: "Tractor owners and prospects with village-wise details." },
      { property: "og:title", content: "Customers — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership customer master." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"owners" | "all">("owners");

  const { data, isLoading } = useQuery({
    queryKey: ["customers-with-purchases"],
    queryFn: async () => {
      const [c, b] = await Promise.all([
        supabase.from("customers").select("*").order("customer_name"),
        supabase
          .from("bookings")
          .select("id, customer_id, tractor_model, status, booking_number")
          .eq("status", "DELIVERED"),
      ]);
      if (c.error) throw c.error;
      if (b.error) throw b.error;
      const owned = new Map<string, string[]>();
      (b.data ?? []).forEach((row) => {
        const list = owned.get(row.customer_id) ?? [];
        list.push(row.tractor_model);
        owned.set(row.customer_id, list);
      });
      return { customers: c.data ?? [], owned };
    },
  });

  const owned = data?.owned ?? new Map<string, string[]>();
  const rows = (data?.customers ?? [])
    .filter((c) => (tab === "owners" ? owned.has(c.id) : true))
    .filter((c) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [c.customer_name, c.mobile, c.village, c.taluka, c.district]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={tab === "owners" ? `${rows.length} tractor owners` : `${rows.length} customers`}
      />
      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "owners" | "all")}>
              <TabsList>
                <TabsTrigger value="owners">Tractor owners</TabsTrigger>
                <TabsTrigger value="all">All customers</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              className="sm:max-w-sm"
              placeholder="Search by name, mobile or village"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              title={tab === "owners" ? "No delivered customers yet" : "No customers yet"}
              hint={
                tab === "owners"
                  ? "Customers appear here once their tractor is delivered."
                  : "Customers are created from the inquiry form."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead className="hidden md:table-cell">Taluka</TableHead>
                    <TableHead className="hidden md:table-cell">District</TableHead>
                    <TableHead>Tractors owned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => {
                    const models = owned.get(c.id) ?? [];
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link to="/customers/$customerId" params={{ customerId: c.id }} className="hover:underline">
                            {c.customer_name}
                          </Link>
                        </TableCell>
                        <TableCell>{c.mobile}</TableCell>
                        <TableCell>{c.village}</TableCell>
                        <TableCell className="hidden md:table-cell">{c.taluka || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{c.district || "—"}</TableCell>
                        <TableCell className="space-x-1">
                          {models.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            models.map((m, idx) => (
                              <Badge key={`${m}-${idx}`} variant="secondary">
                                {m}
                              </Badge>
                            ))
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
