import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/demos")({
  head: () => ({
    meta: [
      { title: "Demos — KrushiVidhya Automobiles" },
      { name: "description", content: "Scheduled and completed tractor demonstrations." },
      { property: "og:title", content: "Demos — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Scheduled and completed tractor demonstrations." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Demos" subtitle="Scheduled and completed tractor demonstrations." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
