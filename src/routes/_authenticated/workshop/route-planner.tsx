import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/lib/auth";
import { useProfiles, useProfileMap } from "@/lib/queries";
import { useServiceJobs, useServiceRoutes, villageDemand } from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/workshop/route-planner")({
  head: () => ({
    meta: [
      { title: "Service route planner · KrushiVidhya Automobiles" },
      {
        name: "description",
        content: "Plan field-visit routes by village from pending tractor service jobs, priority complaints first.",
      },
      { property: "og:title", content: "Service route planner · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Village-wise field visit planning for the tractor workshop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutePlannerPage,
});

function RoutePlannerPage() {
  const { data: me } = useMe();
  const { data: jobs, isLoading } = useServiceJobs();
  const { data: routes } = useServiceRoutes();
  const { data: staff } = useProfiles();
  const names = useProfileMap();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [mechanic, setMechanic] = useState<string>("");
  const [remarks, setRemarks] = useState("");

  const canEdit = !!(me?.isWorkshop || me?.isManagement);
  const demand = villageDemand(jobs ?? []);
  const plan = demand.filter((v) => selected.includes(v.village));
  const totalStops = plan.reduce((s, v) => s + v.total, 0);

  const toggle = (village: string) =>
    setSelected((cur) => (cur.includes(village) ? cur.filter((v) => v !== village) : [...cur, village]));

  const saveRoute = useMutation({
    mutationFn: async () => {
      if (plan.length === 0) throw new Error("Select at least one village");
      const { data: route, error } = await supabase
        .from("service_routes")
        .insert({
          route_number: "",
          visit_date: visitDate,
          assigned_to: mechanic || null,
          villages: plan.map((v) => v.village),
          remarks: remarks.trim() || null,
        } as never)
        .select("id, route_number")
        .single();
      if (error) throw error;

      let order = 0;
      const stops = plan.flatMap((v) =>
        v.jobs.map((j) => ({
          route_id: (route as { id: string }).id,
          service_job_id: j.id,
          village: v.village,
          visit_order: order++,
        })),
      );
      const { error: sErr } = await supabase.from("service_route_stops").insert(stops as never);
      if (sErr) throw sErr;

      const { error: jErr } = await supabase
        .from("service_jobs")
        .update({ planned_visit_date: visitDate } as never)
        .in("id", stops.map((s) => s.service_job_id));
      if (jErr) throw jErr;

      return route as { id: string; route_number: string };
    },
    onSuccess: (route) => {
      toast.success(`Route ${route.route_number} planned`);
      setSelected([]);
      setRemarks("");
      qc.invalidateQueries({ queryKey: ["service-routes"] });
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me && !me.isWorkshop) {
    return (
      <div>
        <PageHeader title="Route planner" subtitle="Field visit planning" />
        <EmptyState title="Workshop access only" hint="Ask the dealer or a manager to assign you a workshop role." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Route planner"
        subtitle="Pick villages with pending field visits and build a visit route — problem complaints lead the route."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending field visits by village</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : demand.length === 0 ? (
              <EmptyState
                title="No pending field visits"
                hint="Job cards with service mode “Field visit” appear here grouped by village."
              />
            ) : (
              demand.map((v) => (
                <label
                  key={v.village}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selected.includes(v.village)}
                    onCheckedChange={() => toggle(v.village)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{v.village}</span>
                      <Badge variant="outline">{v.total} pending</Badge>
                      {v.problems > 0 && <Badge variant="destructive">{v.problems} problem</Badge>}
                      <span className="text-xs text-muted-foreground">
                        oldest {v.days} day{v.days === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {v.jobs.slice(0, 4).map((j) => (
                        <li key={j.id} className="truncate text-xs text-muted-foreground">
                          {j.job_number} · {j.customer_name} · {j.model ?? "—"} · {j.complaint ?? "—"}
                        </li>
                      ))}
                      {v.jobs.length > 4 && (
                        <li className="text-xs text-muted-foreground">+{v.jobs.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                </label>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Plan this route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="visit_date">Visit date</Label>
                <Input
                  id="visit_date"
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Mechanic</Label>
                <Select value={mechanic} onValueChange={setMechanic}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {(staff ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="route_remarks">Remarks</Label>
                <Textarea
                  id="route_remarks"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="rounded-md border border-dashed border-border p-3 text-sm">
                <p className="font-semibold">
                  {plan.length} village{plan.length === 1 ? "" : "s"} · {totalStops} stop
                  {totalStops === 1 ? "" : "s"}
                </p>
                <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {plan.map((v, i) => (
                    <li key={v.village}>
                      {i + 1}. {v.village} ({v.total})
                    </li>
                  ))}
                  {plan.length === 0 && <li>Select villages to build the route.</li>}
                </ol>
              </div>

              <Button
                className="w-full"
                disabled={!canEdit || plan.length === 0 || saveRoute.isPending}
                onClick={() => saveRoute.mutate()}
              >
                <RouteIcon className="mr-1 h-4 w-4" />
                {saveRoute.isPending ? "Saving…" : "Save route plan"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Planned routes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(routes ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No routes planned yet.</p>
              ) : (
                (routes ?? []).slice(0, 8).map((r) => (
                  <Link
                    key={r.id}
                    to="/print/route-sheet/$routeId"
                    params={{ routeId: r.id }}
                    className="block rounded-md border border-border p-2.5 hover:bg-muted/50"
                  >
                    <p className="text-sm font-semibold">
                      {r.route_number} · {r.visit_date}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {r.villages.join(", ")} · {names.get(r.assigned_to ?? "") ?? "Unassigned"}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
