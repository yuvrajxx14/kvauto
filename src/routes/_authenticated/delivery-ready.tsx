import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/delivery-ready")({
  head: () => ({
    meta: [
      { title: "Delivery Ready — KrushiVidhya Automobiles" },
      { name: "description", content: "Bookings with allocated tractors awaiting delivery." },
      { property: "og:title", content: "Delivery Ready — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Bookings with allocated tractors awaiting delivery." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Delivery Ready" subtitle="Bookings with allocated tractors awaiting delivery." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
