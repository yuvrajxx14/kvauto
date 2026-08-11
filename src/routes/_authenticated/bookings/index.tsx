import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — KrushiVidhya Automobiles" },
      { name: "description", content: "Confirmed tractor bookings, payments and balances." },
      { property: "og:title", content: "Bookings — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Confirmed tractor bookings, payments and balances." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Bookings" subtitle="Confirmed tractor bookings, payments and balances." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
