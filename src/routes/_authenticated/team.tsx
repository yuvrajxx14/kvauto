import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — KrushiVidhya Automobiles" },
      { name: "description", content: "Staff and role management for the dealership." },
      { property: "og:title", content: "Team — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Staff and role management for the dealership." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Team" subtitle="Staff and role management for the dealership." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
