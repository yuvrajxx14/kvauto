import { createFileRoute, useParams } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { EmptyState } from "@/components/sales/ui";
import { useProfileMap } from "@/lib/queries";
import { useServiceRoute } from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/print/route-sheet/$routeId")({
  head: () => ({
    meta: [
      { title: "Field visit route sheet · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable village-wise field visit route sheet for workshop service jobs." },
      { property: "og:title", content: "Field visit route sheet · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Village route sheet for pending tractor service visits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RouteSheetPrint,
});

function RouteSheetPrint() {
  const { routeId } = useParams({ from: "/_authenticated/print/route-sheet/$routeId" });
  const { data, isLoading } = useServiceRoute(routeId);
  const names = useProfileMap();

  if (isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!data?.route) return <EmptyState title="Route not found" />;

  const route = data.route;
  const byVillage = new Map<string, typeof data.stops>();
  data.stops.forEach((s) => byVillage.set(s.village, [...(byVillage.get(s.village) ?? []), s]));

  return (
    <PrintShell title="Field Visit Route Sheet">
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div>
          <PrintRow label="Route number" value={route.route_number} />
          <PrintRow label="Visit date" value={route.visit_date} />
        </div>
        <div>
          <PrintRow label="Mechanic" value={names.get(route.assigned_to ?? "") ?? "—"} />
          <PrintRow label="Villages" value={route.villages.join(", ")} />
        </div>
      </div>

      {[...byVillage.entries()].map(([village, stops], i) => (
        <section key={village} className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            {i + 1}. {village} ({stops.length})
          </h2>
          <table className="mt-1 w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1">Job</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Model</th>
                <th>Complaint</th>
                <th className="w-16">Done</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((s) => (
                <tr key={s.id} className="border-b border-dashed align-top">
                  <td className="py-1">{s.job.job_number}</td>
                  <td>{s.job.customer_name}</td>
                  <td>{s.job.mobile}</td>
                  <td>{s.job.model ?? "—"}</td>
                  <td>
                    {s.job.service_type === "PROBLEM" ? `${s.job.problem_category ?? "Problem"} — ` : ""}
                    {s.job.complaint ?? "—"}
                  </td>
                  <td>☐</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {route.remarks && <p className="mt-4 text-xs text-muted-foreground">Remarks: {route.remarks}</p>}

      <div className="mt-10 flex justify-between text-xs">
        <span>Mechanic signature</span>
        <span>Workshop Manager</span>
      </div>
    </PrintShell>
  );
}
