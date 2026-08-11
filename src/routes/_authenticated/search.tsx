import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search — KrushiVidhya Automobiles" },
      { name: "description", content: "Global search across customers, inquiries and bookings." },
      { property: "og:title", content: "Search — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Global search across customers, inquiries and bookings." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Search" subtitle="Global search across customers, inquiries and bookings." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
