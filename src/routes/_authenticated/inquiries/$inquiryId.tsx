import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/sales/ui";

export const Route = createFileRoute("/_authenticated/inquiries/$inquiryId")({
  head: () => ({
    meta: [
      { title: "Inquiry Detail — KrushiVidhya Automobiles" },
      { name: "description", content: "Full inquiry pipeline, follow-ups, demos, negotiation and booking actions." },
      { property: "og:title", content: "Inquiry Detail — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Full inquiry pipeline, follow-ups, demos, negotiation and booking actions." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Inquiry Detail" subtitle="Full inquiry pipeline, follow-ups, demos, negotiation and booking actions." />
      <EmptyState title="Coming up next" hint="This screen is being built in the next step." />
    </div>
  );
}
