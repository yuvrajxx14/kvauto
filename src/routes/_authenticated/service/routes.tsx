import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles } from "@/lib/queries";
import { fmtDate } from "@/lib/sales";
import {
  DEALERSHIP_ORIGIN,
  ROUTE_STATUS_LABEL,
  googleMapsRouteUrl,
  usePendingFieldJobs,
  useRouteStops,
  useServiceRoutes,
} from "@/lib/service";

export const Route = createFileRoute("/_authenticated/service/routes")({
  head: () => ({
    meta: [
      { title: "Field Service Route Planner · KrushiVidhya Automobiles" },
      { name: "description", content: "Plan village-wise field service routes from the KrushiVidhya Automobiles dealership and back, with Google Maps navigation." },
      { property: "og:title", content: "Field Service Route Planner · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Group pending field visits by village and navigate the full round trip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutePlannerPage,
});

function RoutePlannerPage() {
  const qc = useQueryClient();
  const { data: jobs } = usePendingFieldJobs();
  const { data: routes } = useServiceRoutes();
  const { data: staff } = useProfiles();

  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [mechanic, setMechanic] = useState("none");
  const [selected, setSelected] = useState<string[]>([]);
  const [openRoute, setOpenRoute] = useState<string | null>(null);

  const byVillage = useMemo(() => {
    const map = new Map<string, NonNullable<typeof jobs>>();
    (jobs ?? []).forEach((j) => {
      const key = j.village || "Unknown village";
      map.set(key, [...(map.get(key) ?? []), j] as never);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [jobs]);

  const selectedJobs = (jobs ?? []).filter((j) => selected.includes(j.id));
  const orderedVillages = useMemo(() => {
    const seen: string[] = [];
    selectedJobs.forEach((j) => {
      const v = j.village || "Unknown village";
      if (!seen.includes(v)) seen.push(v);
    });
    return seen;
  }, [selectedJobs]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleVillage = (village: string, ids: string[]) => {
    const all = ids.every((id) => selected.includes(id));
    setSelected((s) => (all ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
    void village;
  };

  const create = useMutation({
    mutationFn: async () => {
      if (selectedJobs.length === 0) throw new Error("Select at least one field visit");
      const { data: auth } = await supabase.auth.getUser();
      const { data: route, error } = await supabase
        .from("service_routes")
        .insert({
          visit_date: visitDate,
          assigned_to: mechanic === "none" ? null : mechanic,
          villages: orderedVillages,
          status: "PLANNED",
          created_by: auth.user?.id ?? null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      const stops = selectedJobs
        .slice()
        .sort((a, b) => orderedVillages.indexOf(a.village) - orderedVillages.indexOf(b.village))
        .map((j, i) => ({
          route_id: route.id,
          service_job_id: j.id,
          village: j.village || "Unknown village",
          visit_order: i + 1,
        }));
      const { error: stopErr } = await supabase.from("service_route_stops").insert(stops as never);
      if (stopErr) throw stopErr;

      await supabase
        .from("service_jobs")
        .update({ planned_visit_date: visitDate } as never)
        .in("id", selectedJobs.map((j) => j.id));
      return route.id as string;
    },
    onSuccess: (id) => {
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["service-routes"] });
      qc.invalidateQueries({ queryKey: ["service-field-jobs"] });
      setOpenRoute(id);
      toast.success("Route planned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRouteStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("service_routes").update({ status } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-routes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Field service route planner"
        subtitle={`Round trip from ${DEALERSHIP_ORIGIN} → selected villages → back to the dealership`}
        actions={
          <Button
            variant="outline"
            asChild
            disabled={orderedVillages.length === 0}
          >
            <a href={googleMapsRouteUrl(orderedVillages)} target="_blank" rel="noreferrer">
              <Navigation className="mr-1 h-4 w-4" /> Preview on Google Maps
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">
                Pending field visits by village{" "}
                <span className="text-sm font-normal text-muted-foreground">({jobs?.length ?? 0})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {byVillage.length === 0 && (
                <p className="text-sm text-muted-foreground">No field visits pending right now.</p>
              )}
              {byVillage.map(([village, list]) => {
                const ids = list.map((j) => j.id);
                const all = ids.every((id) => selected.includes(id));
                return (
                  <div key={village} className="rounded-md border border-border">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-4 w-4 text-primary" /> {village}
                        <span className="font-normal text-muted-foreground">({list.length})</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toggleVillage(village, ids)}>
                        {all ? "Clear" : "Select all"}
                      </Button>
                    </div>
                    <div className="divide-y divide-border">
                      {list.map((j) => (
                        <label key={j.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                          <Checkbox
                            className="mt-0.5"
                            checked={selected.includes(j.id)}
                            onCheckedChange={() => toggle(j.id)}
                          />
                          <span className="min-w-0">
                            <span className="font-medium">{j.job_number}</span> · {j.customer_name} · {j.mobile}
                            <span className="block text-xs text-muted-foreground">
                              {j.complaint ?? "No complaint noted"} · {j.priority}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Planned routes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(routes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No routes planned yet.</p>
              )}
              {(routes ?? []).map((r) => (
                <div key={r.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {r.route_number}{" "}
                        <Badge variant="secondary" className="ml-1">{ROUTE_STATUS_LABEL[r.status] ?? r.status}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(r.visit_date)} · {r.technician?.full_name ?? "Unassigned"} · {(r.villages ?? []).join(" → ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={googleMapsRouteUrl(r.villages ?? [])} target="_blank" rel="noreferrer">
                          <Navigation className="mr-1 h-4 w-4" /> Navigate
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpenRoute(openRoute === r.id ? null : r.id)}>
                        {openRoute === r.id ? "Hide stops" : "Stops"}
                      </Button>
                      {r.status === "PLANNED" && (
                        <Button size="sm" onClick={() => setRouteStatus.mutate({ id: r.id, status: "IN_PROGRESS" })}>
                          Start
                        </Button>
                      )}
                      {r.status === "IN_PROGRESS" && (
                        <Button size="sm" onClick={() => setRouteStatus.mutate({ id: r.id, status: "COMPLETED" })}>
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  {openRoute === r.id && <RouteStops routeId={r.id} />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Plan a route</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Visit date</Label>
                <Input className="mt-1" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mechanic</Label>
                <Select value={mechanic} onValueChange={setMechanic}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {(staff ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Route</p>
                <p className="mt-1">
                  Dealership
                  {orderedVillages.map((v) => (
                    <span key={v}> → {v}</span>
                  ))}
                  {" → "}Dealership
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.length} stop{selected.length === 1 ? "" : "s"} selected
                </p>
              </div>
              <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || selected.length === 0}>
                {create.isPending ? "Saving…" : "Create route"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RouteStops({ routeId }: { routeId: string }) {
  const qc = useQueryClient();
  const { data: stops } = useRouteStops(routeId);

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("service_route_stops").update({ done } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-route-stops", routeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {(stops ?? []).length === 0 && <p className="text-sm text-muted-foreground">No stops on this route.</p>}
      {(stops ?? []).map((s) => (
        <div key={s.id} className="flex items-center gap-3 text-sm">
          <Checkbox checked={s.done} onCheckedChange={(v) => toggleDone.mutate({ id: s.id, done: !!v })} />
          <span className="w-6 text-xs text-muted-foreground">{s.visit_order}.</span>
          <span className={s.done ? "text-muted-foreground line-through" : ""}>
            {s.village} · {s.job?.customer_name} ({s.job?.mobile})
          </span>
          {s.job?.id && (
            <Button asChild size="sm" variant="ghost" className="ml-auto">
              <Link to="/service/$jobId" params={{ jobId: s.job.id }}>Job card</Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
