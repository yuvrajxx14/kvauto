import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/followups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — KrushiVidhya Automobiles" },
      { name: "description", content: "Today, overdue and upcoming follow-up tasks." },
      { property: "og:title", content: "Follow-ups — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Today, overdue and upcoming follow-up tasks." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Today, overdue and upcoming follow-up tasks." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
