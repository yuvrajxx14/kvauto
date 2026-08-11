import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — KrushiVidhya Automobiles" },
      { name: "description", content: "Farmer and institutional customer master with village-wise details." },
      { property: "og:title", content: "Customers — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Dealership customer master." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [c.customer_name, c.mobile, c.village, c.taluka, c.district]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(s));
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${rows.length} customers`} />
      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4">
          <Input
            className="mb-3 sm:max-w-sm"
            placeholder="Search by name, mobile or village"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState title="No customers yet" hint="Customers are created from the inquiry form." />
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
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
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
                      <TableCell>{c.customer_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
