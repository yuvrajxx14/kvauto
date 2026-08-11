import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — KrushiVidhya Automobiles" },
      { name: "description", content: "Sales, model demand, village-wise and salesman performance reports." },
      { property: "og:title", content: "Reports — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Sales, model demand, village-wise and salesman performance reports." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales, model demand, village-wise and salesman performance reports." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
