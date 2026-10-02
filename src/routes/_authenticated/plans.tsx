import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar, FilterSelect, SearchBox } from "@/components/sales/filters";
import { usePerms } from "@/lib/permissions";
import { useStaffWithRoles } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Monthly plan & daily targets · KrushiVidhya Automobiles" },
      { name: "description", content: "Set monthly targets, split them day-wise and assign daily work to staff." },
      { property: "og:title", content: "Monthly plan & daily targets · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Monthly, weekly and daily targets with staff assignments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlansPage,
});

const METRICS = [
  { value: "INQUIRY", label: "Inquiries" },
  { value: "BOOKING", label: "Bookings" },
  { value: "DELIVERY", label: "Deliveries" },
  { value: "SERVICE", label: "Service jobs" },
  { value: "CUSTOM", label: "Custom task" },
];
const metricLabel = (m: string) => METRICS.find((x) => x.value === m)?.label ?? m;

type Plan = { id: string; month_start: string; metric: string; title: string; monthly_target: number };
type PlanDay = { id: string; plan_id: string; day: string; target: number };
type Task = { id: string; plan_id: string | null; day: string; assigned_to: string; title: string; target: number; achieved: number; done: boolean };

const db = supabase as unknown as { from: (t: string) => any };

function monthDays(monthStart: string) {
  const [y, m] = monthStart.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${monthStart.slice(0, 8)}${String(i + 1).padStart(2, "0")}`);
}
const isSunday = (d: string) => new Date(d + "T00:00:00").getDay() === 0;
function weekOf(d: string) {
  return Math.ceil(Number(d.slice(8, 10)) / 7);
}

function PlansPage() {
  const perms = usePerms();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const monthStart = `${month}-01`;
  const days = monthDays(monthStart);
  const [day, setDay] = useState(todayISO());
  const [selPlan, setSelPlan] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");
  const { data: staff } = useStaffWithRoles();
  const staffName = (id: string) => staff?.find((s) => s.id === id)?.full_name ?? "—";

  const { data } = useQuery({
    queryKey: ["plans", monthStart],
    queryFn: async () => {
      const end = days[days.length - 1];
      const [p, d, t] = await Promise.all([
        db.from("monthly_plans").select("*").eq("month_start", monthStart).order("created_at"),
        db.from("plan_days").select("*").gte("day", monthStart).lte("day", end),
        db.from("plan_tasks").select("*").gte("day", monthStart).lte("day", end).order("created_at"),
      ]);
      if (p.error) throw p.error;
      return { plans: (p.data ?? []) as Plan[], days: (d.data ?? []) as PlanDay[], tasks: (t.data ?? []) as Task[] };
    },
  });
  const plans = data?.plans ?? [];
  const planDays = data?.days ?? [];
  const tasks = data?.tasks ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["plans"] });

  const addPlan = useMutation({
    mutationFn: async (v: { metric: string; title: string; target: number; skipSun: boolean }) => {
      const { data: p, error } = await db
        .from("monthly_plans")
        .insert({ month_start: monthStart, metric: v.metric, title: v.title, monthly_target: v.target })
        .select()
        .single();
      if (error) throw error;
      const work = days.filter((d) => !(v.skipSun && isSunday(d)));
      const base = Math.floor(v.target / work.length);
      let rem = v.target - base * work.length;
      const rows = days.map((d) => {
        if (!work.includes(d)) return { plan_id: p.id, day: d, target: 0 };
        const t = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        return { plan_id: p.id, day: d, target: t };
      });
      const r = await db.from("plan_days").insert(rows);
      if (r.error) throw r.error;
    },
    onSuccess: () => { toast.success("Monthly plan added and split day-wise"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setDayTarget = useMutation({
    mutationFn: async (v: { id: string; target: number }) => {
      const { error } = await db.from("plan_days").update({ target: v.target }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const addTask = useMutation({
    mutationFn: async (v: { plan_id: string | null; assigned_to: string; title: string; target: number }) => {
      const { error } = await db.from("plan_tasks").insert({ ...v, day });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Work assigned"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updTask = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<Task> }) => {
      const { error } = await db.from("plan_tasks").update(v.patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const delPlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("monthly_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const achievedFor = (planId: string, pred: (d: string) => boolean) =>
    tasks.filter((t) => t.plan_id === planId && pred(t.day)).reduce((s, t) => s + Number(t.achieved || 0), 0);
  const targetFor = (planId: string, pred: (d: string) => boolean) =>
    planDays.filter((d) => d.plan_id === planId && pred(d.day)).reduce((s, d) => s + Number(d.target || 0), 0);

  const week = weekOf(day);
  const dayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.day === day)
        .filter((t) => perms.isManagement || t.assigned_to === user?.id)
        .filter((t) => staffFilter === "all" || t.assigned_to === staffFilter)
        .filter((t) => !q || `${t.title} ${staffName(t.assigned_to)}`.toLowerCase().includes(q.toLowerCase())),
    [tasks, day, staffFilter, q, staff, perms.isManagement, user?.id],
  );
  const editing = plans.find((p) => p.id === selPlan);

  return (
    <div>
      <PageHeader title="Monthly plan" subtitle="Monthly targets split into weekly and daily targets, with work assigned to staff" />

      <FilterBar>
        <div>
          <Label className="text-xs">Month</Label>
          <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setDay(`${e.target.value}-01`); }} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">Day</Label>
          <Input type="date" value={day} min={days[0]} max={days[days.length - 1]} onChange={(e) => setDay(e.target.value)} className="w-44" />
        </div>
      </FilterBar>

      {perms.isManagement && <NewPlanForm onAdd={(v) => addPlan.mutate(v)} busy={addPlan.isPending} />}

      <Card className="mb-4 shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Targets</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Today ({day.slice(8)})</TableHead>
                <TableHead className="text-right">Week {week}</TableHead>
                <TableHead className="text-right">Month</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No plan for this month yet.</TableCell></TableRow>}
              {plans.map((p) => {
                const isDay = (d: string) => d === day;
                const isWeek = (d: string) => weekOf(d) === week;
                const all = () => true;
                const cell = (pred: (d: string) => boolean) => `${achievedFor(p.id, pred)} / ${targetFor(p.id, pred)}`;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-medium">{p.title}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{metricLabel(p.metric)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{cell(isDay)}</TableCell>
                    <TableCell className="text-right">{cell(isWeek)}</TableCell>
                    <TableCell className="text-right">{cell(all)}</TableCell>
                    <TableCell className="text-right">
                      {perms.isManagement && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelPlan(selPlan === p.id ? null : p.id)}>Day-wise</Button>
                          <Button size="sm" variant="ghost" onClick={() => confirm("Delete this plan?") && delPlan.mutate(p.id)}>Delete</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <Card className="mb-4 shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Day-wise targets · {editing.title}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {planDays.filter((d) => d.plan_id === editing.id).sort((a, b) => a.day.localeCompare(b.day)).map((d) => (
                <div key={d.id} className={`rounded-md border p-1.5 text-xs ${isSunday(d.day) ? "bg-muted" : ""}`}>
                  <p className="text-muted-foreground">{d.day.slice(8)} {new Date(d.day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</p>
                  <Input
                    type="number"
                    defaultValue={d.target}
                    className="mt-1 h-7"
                    onBlur={(e) => Number(e.target.value) !== Number(d.target) && setDayTarget.mutate({ id: d.id, target: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total of days: {targetFor(editing.id, () => true)} · Monthly target: {editing.monthly_target}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Work for {day}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {perms.isManagement && (
            <AssignForm plans={plans} staff={staff ?? []} onAdd={(v) => addTask.mutate(v)} />
          )}
          <FilterBar className="mb-0">
            <SearchBox value={q} onChange={setQ} placeholder="Search work or staff" />
            {perms.isManagement && (
              <FilterSelect
                value={staffFilter}
                onChange={setStaffFilter}
                options={[{ value: "all", label: "All staff" }, ...(staff ?? []).map((s) => ({ value: s.id, label: s.full_name }))]}
              />
            )}
          </FilterBar>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Done</TableHead>
                <TableHead>Work</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Achieved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayTasks.length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No work assigned for this day.</TableCell></TableRow>}
              {dayTasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Checkbox checked={t.done} onCheckedChange={(v) => updTask.mutate({ id: t.id, patch: { done: !!v, achieved: v ? Math.max(t.achieved, t.target) : t.achieved } })} /></TableCell>
                  <TableCell>
                    {t.title}
                    {t.plan_id && <p className="text-xs text-muted-foreground">{plans.find((p) => p.id === t.plan_id)?.title}</p>}
                  </TableCell>
                  <TableCell>{staffName(t.assigned_to)}</TableCell>
                  <TableCell className="text-right">{t.target}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      defaultValue={t.achieved}
                      className="ml-auto h-8 w-20"
                      onBlur={(e) => Number(e.target.value) !== Number(t.achieved) && updTask.mutate({ id: t.id, patch: { achieved: Number(e.target.value) } })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewPlanForm({ onAdd, busy }: { onAdd: (v: { metric: string; title: string; target: number; skipSun: boolean }) => void; busy: boolean }) {
  const [metric, setMetric] = useState("BOOKING");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [skipSun, setSkipSun] = useState(true);
  return (
    <Card className="mb-4 shadow-card">
      <CardHeader className="pb-2"><CardTitle className="text-base">Add monthly target</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        <div><Label className="text-xs">Type</Label><FilterSelect value={metric} onChange={setMetric} options={METRICS} className="w-40" /></div>
        <div className="flex-1"><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tractor bookings" /></div>
        <div><Label className="text-xs">Monthly target</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="w-32" /></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><Checkbox checked={skipSun} onCheckedChange={(v) => setSkipSun(!!v)} /> Skip Sundays</label>
        <Button
          disabled={busy || !target}
          onClick={() => { onAdd({ metric, title: title || metricLabel(metric), target: Number(target), skipSun }); setTitle(""); setTarget(""); }}
        >
          Add & split day-wise
        </Button>
      </CardContent>
    </Card>
  );
}

function AssignForm({ plans, staff, onAdd }: { plans: Plan[]; staff: { id: string; full_name: string }[]; onAdd: (v: { plan_id: string | null; assigned_to: string; title: string; target: number }) => void }) {
  const [planId, setPlanId] = useState("none");
  const [who, setWho] = useState("");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div><Label className="text-xs">Plan</Label><FilterSelect value={planId} onChange={setPlanId} options={[{ value: "none", label: "No plan" }, ...plans.map((p) => ({ value: p.id, label: p.title }))]} className="w-44" /></div>
      <div><Label className="text-xs">Staff</Label><FilterSelect value={who} onChange={setWho} placeholder="Select staff" options={staff.map((s) => ({ value: s.id, label: s.full_name }))} className="w-44" /></div>
      <div className="flex-1"><Label className="text-xs">Work</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call 10 hot leads in Jasdan" /></div>
      <div><Label className="text-xs">Target</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="w-20" /></div>
      <Button
        disabled={!who || !title}
        onClick={() => { onAdd({ plan_id: planId === "none" ? null : planId, assigned_to: who, title, target: Number(target || 1) }); setTitle(""); }}
      >
        Assign
      </Button>
    </div>
  );
}
