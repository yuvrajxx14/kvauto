import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/bookings/$bookingId")({
  head: () => ({
    meta: [
      { title: "Booking Detail — KrushiVidhya Automobiles" },
      { name: "description", content: "Booking payments, tractor allocation and delivery." },
      { property: "og:title", content: "Booking Detail — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Booking payments, tractor allocation and delivery." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Booking Detail" subtitle="Booking payments, tractor allocation and delivery." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
