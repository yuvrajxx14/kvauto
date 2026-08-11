import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/negotiations")({
  head: () => ({
    meta: [
      { title: "Negotiations — KrushiVidhya Automobiles" },
      { name: "description", content: "Quotation and price negotiation tracking." },
      { property: "og:title", content: "Negotiations — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Quotation and price negotiation tracking." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Negotiations" subtitle="Quotation and price negotiation tracking." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
