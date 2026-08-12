import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Plus, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { StatusBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { inr, fmtDate } from "@/lib/sales";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/booking";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/bookings/")({
  component: BookingsPage,
});

function BookingsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", search],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select(`
          *,
          customer:customers(id, customer_name, mobile),
          inquiry:inquiries(id, inquiry_number)
        `)
        .order("booking_date", { ascending: false });

      const term = search.trim();
      if (term) {
        q = q.or(`booking_number.ilike.%${term}%,tractor_model.ilike.%${term}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Confirmed tractor bookings from customer inquiries"
        actions={
          <Button asChild size="sm">
            <Link to="/inquiries">
              <Plus className="mr-1 h-4 w-4" /> Create from inquiry
            </Link>
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search booking or tractor model…"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading bookings…</p>
          ) : data?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Tractor</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3 text-right">Deal price</th>
                    <th className="px-3 py-3 text-right">Received</th>
                    <th className="px-3 py-3 text-right">Outstanding</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium">{b.booking_number}</td>
                      <td className="px-3 py-3">
                        <div>{b.customer?.customer_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{b.customer?.mobile ?? ""}</div>
                      </td>
                      <td className="px-3 py-3">{b.tractor_model} {b.variant ? `· ${b.variant}` : ""}</td>
                      <td className="px-3 py-3">{fmtDate(b.booking_date)}</td>
                      <td className="px-3 py-3 text-right">{inr(b.final_price)}</td>
                      <td className="px-3 py-3 text-right">{inr(b.amount_received)}</td>
                      <td className="px-3 py-3 text-right">{inr(Math.max(0, b.final_price - b.amount_received))}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={b.status as BookingStatus} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link to="/bookings/$bookingId" params={{ bookingId: b.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No bookings found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
