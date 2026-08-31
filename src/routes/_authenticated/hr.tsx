import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Check, ClipboardCheck, Clock3, FileText, MapPin, Plus, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useProfiles } from "@/lib/queries";
import { usePerms } from "@/lib/permissions";
import {
  ATTENDANCE_LABEL, DEPARTMENT_LABEL, DEPARTMENTS, fmtMinutes, fmtTime, mapsLink, monthLabel,
  monthStart, useAttendance, useEmployeeOnboarding, useEmployees, useMyEmployee, useOnboardingMaster,
  useSopAcks, useSopQuestions, useSops, useTodayAttendance, type Employee,
} from "@/lib/hr";
import { PageHeader, KpiCard, EmptyState } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "HR & Attendance · KrushiVidhya Automobiles" },
      { name: "description", content: "Staff onboarding, SOP training, attendance and performance for KrushiVidhya Automobiles." },
      { property: "og:title", content: "HR & Attendance · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Manage dealership people, training and attendance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrPage,
});

function HrPage() {
  const perms = usePerms();
  const { data: me } = useMe();
  const isManager = perms.isManagement;
  const { data: employees = [], isLoading } = useEmployees(isManager);
  const { data: myEmployee } = useMyEmployee();
  const [selectedId, setSelectedId] = useState<string | undefined>(myEmployee?.id);
  const [tab, setTab] = useState("attendance");
  const selected = employees.find((e) => e.id === selectedId) ?? (myEmployee ?? null);

  if (!perms.can("hr.view")) return <EmptyState title="HR access required" hint="Ask a manager to grant HR access to your role." />;

  return (
    <div>
      <PageHeader
        title="HR & attendance"
        subtitle="People, training, attendance and performance in one place"
        actions={isManager ? <NewEmployeeButton /> : undefined}
      />

      {isManager && <HrOverview employees={employees} />}
      {!isManager && <SelfAttendance employee={myEmployee ?? null} />}

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="flex w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="training">SOP training</TabsTrigger>
          {isManager && <TabsTrigger value="people">Employee master</TabsTrigger>}
          {isManager && <TabsTrigger value="performance">Performance</TabsTrigger>}
        </TabsList>
        <TabsContent value="attendance">
          {isManager ? <AttendanceManager employees={employees} selected={selected} onSelect={setSelectedId} /> : <SelfAttendanceHistory employee={myEmployee ?? null} />}
        </TabsContent>
        <TabsContent value="training">
          <TrainingWorkspace employee={selected} isManager={isManager} />
        </TabsContent>
        {isManager && <TabsContent value="people"><EmployeeMaster employees={employees} isLoading={isLoading} onSelect={(id) => { setSelectedId(id); setTab("training"); }} /></TabsContent>}
        {isManager && <TabsContent value="performance"><PerformanceBoard employees={employees} /></TabsContent>}
      </Tabs>
    </div>
  );
}

function HrOverview({ employees }: { employees: Employee[] }) {
  const month = monthStart();
  const from = month;
  const to = `${new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 1).toISOString().slice(0, 10)}`;
  const { data: attendance = [] } = useAttendance({ from, to });
  const active = employees.filter((e) => e.employment_status === "ACTIVE");
  const present = new Set(attendance.filter((a) => a.work_date === new Date().toISOString().slice(0, 10) && a.status !== "ABSENT").map((a) => a.employee_id)).size;
  const inProgress = employees.filter((e) => e.onboarding_status !== "COMPLETED").length;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <KpiCard label="Active employees" value={active.length} hint="Current staff" icon={<Users className="h-4 w-4" />} />
      <KpiCard label="Present today" value={`${present} / ${active.length}`} hint="Live attendance" icon={<Clock3 className="h-4 w-4" />} tone="success" />
      <KpiCard label="Onboarding open" value={inProgress} hint="Need checklist completion" icon={<ClipboardCheck className="h-4 w-4" />} tone="warning" />
      <KpiCard label="Training centre" value="SOPs" hint="Read, quiz, certify" icon={<ShieldCheck className="h-4 w-4" />} tone="info" />
    </div>
  );
}

function NewEmployeeButton() {
  const [open, setOpen] = useState(false);
  return <><Button onClick={() => setOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Onboard employee</Button><EmployeeDialog open={open} onOpenChange={setOpen} /></>;
}

function EmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const [form, setForm] = useState({ employee_code: "", full_name: "", mobile: "", email: "", department: "SALES", designation: "", date_of_joining: new Date().toISOString().slice(0, 10), monthly_salary: "0", user_id: "none" });
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("employees").insert({ ...form, monthly_salary: Number(form.monthly_salary) || 0, user_id: form.user_id === "none" ? null : form.user_id }).select("id").single();
      if (error) throw error;
      const { data: master } = await supabase.from("onboarding_checklist").select("item_key, label, category, sort_order").eq("active", true).order("sort_order");
      if (data && master?.length) {
        const { error: checklistError } = await supabase.from("employee_onboarding").insert(master.map((item) => ({ ...item, employee_id: data.id })));
        if (checklistError) throw checklistError;
      }
    },
    onSuccess: () => { toast.success("Employee onboarded"); qc.invalidateQueries({ queryKey: ["employees"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const set = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Onboard a new employee</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee code" value={form.employee_code} onChange={(v) => set("employee_code", v)} placeholder="KV-001" />
        <Field label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} placeholder="Employee name" />
        <Field label="Mobile" value={form.mobile} onChange={(v) => set("mobile", v)} placeholder="10 digit mobile" />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="name@example.com" />
        <div className="space-y-2"><Label>Department</Label><Select value={form.department} onValueChange={(v) => set("department", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{DEPARTMENT_LABEL[d]}</SelectItem>)}</SelectContent></Select></div>
        <Field label="Designation" value={form.designation} onChange={(v) => set("designation", v)} placeholder="Sales executive" />
        <Field label="Date of joining" type="date" value={form.date_of_joining} onChange={(v) => set("date_of_joining", v)} />
        <Field label="Monthly salary (₹)" type="number" value={form.monthly_salary} onChange={(v) => set("monthly_salary", v)} />
        <div className="space-y-2 sm:col-span-2"><Label>Link to login (optional)</Label><Select value={form.user_id} onValueChange={(v) => set("user_id", v)}><SelectTrigger><SelectValue placeholder="Link later" /></SelectTrigger><SelectContent><SelectItem value="none">Not linked yet</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} · {p.email ?? "no email"}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Linking the login enables self-marking attendance and personal SOP training.</p></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={save.isPending || !form.employee_code || !form.full_name} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Create employee"}</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

function SelfAttendance({ employee }: { employee: Employee | null }) {
  const qc = useQueryClient();
  const { data: today } = useTodayAttendance(employee?.id);
  const punch = useMutation({
    mutationFn: async (kind: "IN" | "OUT") => {
      if (!navigator.geolocation) throw new Error("Location permission is required to mark attendance on this device.");
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
      const { error } = await supabase.rpc("attendance_punch", { _kind: kind, _lat: pos.coords.latitude, _lng: pos.coords.longitude, _accuracy: pos.coords.accuracy, _address: null, _remarks: null });
      if (error) throw error;
    },
    onSuccess: (_, kind) => { toast.success(kind === "IN" ? "Punched in" : "Punched out"); qc.invalidateQueries({ queryKey: ["attendance"] }); qc.invalidateQueries({ queryKey: ["attendance-today"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!employee) return <Card className="mt-6 border-warning/40"><CardContent className="flex items-center gap-3 p-5 text-sm"><MapPin className="h-5 w-5 text-warning" /><span>Your login is not linked to an employee record. Ask management to link it before marking attendance.</span></CardContent></Card>;
  return <Card className="mt-6 border-primary/20 bg-primary/5"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Good morning, {employee.full_name.split(" ")[0]}</p><p className="mt-1 text-sm text-muted-foreground">Location and exact time are recorded when you punch.</p>{today?.punch_in_at && <p className="mt-2 text-xs text-muted-foreground">In {fmtTime(today.punch_in_at)} {today.punch_out_at ? `· Out ${fmtTime(today.punch_out_at)}` : "· Still working"}</p>}</div><div className="flex gap-2"><Button disabled={punch.isPending || !!today?.punch_in_at} onClick={() => punch.mutate("IN")}><MapPin className="mr-2 h-4 w-4" /> Punch in</Button><Button variant="outline" disabled={punch.isPending || !today?.punch_in_at || !!today?.punch_out_at} onClick={() => punch.mutate("OUT")}>Punch out</Button></div></CardContent></Card>;
}

function AttendanceManager({ employees, selected, onSelect }: { employees: Employee[]; selected: Employee | null; onSelect: (id: string) => void }) {
  const month = monthStart();
  const { data: records = [], isLoading } = useAttendance({ employeeId: selected?.id, from: month, to: `${new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 1).toISOString().slice(0, 10)}` });
  return <div className="mt-4 space-y-4"><div className="flex flex-wrap items-center gap-3"><Select value={selected?.id ?? "none"} onValueChange={onSelect}><SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} · {e.employee_code}</SelectItem>)}</SelectContent></Select><Badge variant="outline">{monthLabel(month)}</Badge></div><Card><CardHeader className="pb-2"><CardTitle className="text-base">Monthly attendance log</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">In</th><th className="p-3">Out</th><th className="p-3">Hours</th><th className="p-3">Location</th></tr></thead><tbody>{isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={6}>Loading attendance…</td></tr>}{!isLoading && !records.length && <tr><td className="p-4 text-muted-foreground" colSpan={6}>No punches recorded this month.</td></tr>}{records.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="p-3 font-medium">{r.work_date}</td><td className="p-3"><Badge variant="secondary">{ATTENDANCE_LABEL[r.status] ?? r.status}</Badge></td><td className="p-3">{fmtTime(r.punch_in_at)}</td><td className="p-3">{fmtTime(r.punch_out_at)}</td><td className="p-3">{fmtMinutes(r.work_minutes)}</td><td className="p-3">{mapsLink(r.punch_in_lat, r.punch_in_lng) ? <a className="text-primary hover:underline" href={mapsLink(r.punch_in_lat, r.punch_in_lng) ?? "#"} target="_blank" rel="noreferrer">View map</a> : "—"}</td></tr>)}</tbody></table></div></CardContent></Card></div>;
}

function SelfAttendanceHistory({ employee }: { employee: Employee | null }) {
  const month = monthStart();
  const { data: records = [] } = useAttendance({ employeeId: employee?.id, from: month, to: monthEndExclusive(month) });
  if (!employee) return null;
  return <Card className="mt-4"><CardHeader><CardTitle className="text-base">My attendance · {monthLabel(month)}</CardTitle></CardHeader><CardContent className="space-y-2">{records.length ? records.map((r) => <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{r.work_date}</span><span className="text-muted-foreground">{ATTENDANCE_LABEL[r.status]} · {fmtTime(r.punch_in_at)} — {fmtTime(r.punch_out_at)}</span></div>) : <p className="text-sm text-muted-foreground">No attendance marked this month.</p>}</CardContent></Card>;
}

function EmployeeMaster({ employees, isLoading, onSelect }: { employees: Employee[]; isLoading: boolean; onSelect: (id: string) => void }) {
  return <Card className="mt-4"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3">Employee</th><th className="p-3">Department</th><th className="p-3">Joining date</th><th className="p-3">Salary</th><th className="p-3">Onboarding</th><th className="p-3"></th></tr></thead><tbody>{isLoading && <tr><td className="p-4" colSpan={6}>Loading…</td></tr>}{employees.map((e) => <tr key={e.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{e.full_name}</p><p className="text-xs text-muted-foreground">{e.employee_code} · {e.designation ?? "—"}</p></td><td className="p-3">{DEPARTMENT_LABEL[e.department] ?? e.department}</td><td className="p-3">{e.date_of_joining}</td><td className="p-3">₹{Number(e.monthly_salary).toLocaleString("en-IN")}</td><td className="p-3"><Badge variant={e.onboarding_status === "COMPLETED" ? "secondary" : "outline"}>{e.onboarding_status === "COMPLETED" ? "Complete" : "In progress"}</Badge></td><td className="p-3"><Button variant="ghost" size="sm" onClick={() => onSelect(e.id)}>Open</Button></td></tr>)}</tbody></table></div></CardContent></Card>;
}

function TrainingWorkspace({ employee, isManager }: { employee: Employee | null; isManager: boolean }) {
  const { data: sops = [] } = useSops();
  const { data: acks = [] } = useSopAcks(employee?.id);
  const { data: onboarding = [] } = useEmployeeOnboarding(employee?.id ?? "");
  const master = useOnboardingMaster();
  const qc = useQueryClient();
  const [activeSop, setActiveSop] = useState<string | undefined>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const questions = useSopQuestions(activeSop);
  const employeeName = employee?.full_name ?? "your profile";
  const updateChecklist = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => { const { error } = await supabase.from("employee_onboarding").update({ is_done: done, done_at: done ? new Date().toISOString() : null }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employee-onboarding"] }); qc.invalidateQueries({ queryKey: ["employees"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submitQuiz = useMutation({
    mutationFn: async () => {
      if (!activeSop || !employee?.id || !questions.data?.length) throw new Error("This SOP has no quiz questions yet.");
      const correct = questions.data.filter((q) => answers[q.id] === q.correct_index).length;
      const score = Math.round((correct / questions.data.length) * 100);
      const sop = sops.find((s) => s.id === activeSop);
      const { error } = await supabase.from("sop_acknowledgements").upsert({ sop_id: activeSop, employee_id: employee.id, read_at: new Date().toISOString(), attempts: (acks.find((a) => a.sop_id === activeSop)?.attempts ?? 0) + 1, score_percent: score, passed: score >= (sop?.pass_percent ?? 70), passed_at: score >= (sop?.pass_percent ?? 70) ? new Date().toISOString() : null });
      if (error) throw error;
      return score;
    },
    onSuccess: (score) => { toast.success(score >= 70 ? `Quiz passed: ${score}%` : `Score ${score}%. Review the SOP and try again.`); qc.invalidateQueries({ queryKey: ["sop-acks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const doneCount = onboarding.filter((x) => x.is_done).length;
  return <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    {isManager && employee && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Onboarding · {employeeName}</CardTitle><p className="text-sm text-muted-foreground">{doneCount} of {onboarding.length || master.data?.length || 0} items completed</p></CardHeader><CardContent className="space-y-3">{onboarding.length ? onboarding.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"><input type="checkbox" checked={item.is_done} onChange={(e) => updateChecklist.mutate({ id: item.id, done: e.target.checked })} className="mt-0.5" /><span className={item.is_done ? "text-muted-foreground line-through" : ""}>{item.label}<small className="mt-1 block text-xs text-muted-foreground">{item.category}</small></span></label>) : <p className="text-sm text-muted-foreground">This employee was created before the checklist was enabled. Add checklist items from onboarding setup or re-onboard them.</p>}</CardContent></Card>}
    <Card className={!isManager || !employee ? "xl:col-span-2" : ""}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> SOP library</CardTitle><p className="text-sm text-muted-foreground">Read the procedure, then pass its quiz to become certified.</p></CardHeader><CardContent><div className="space-y-2">{sops.length ? sops.map((sop) => { const ack = acks.find((a) => a.sop_id === sop.id); return <div key={sop.id} className="flex flex-col gap-3 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{sop.title}</p><p className="text-xs text-muted-foreground">{DEPARTMENT_LABEL[sop.department] ?? sop.department} · v{sop.version} · pass {sop.pass_percent}%</p>{ack?.passed && <Badge className="mt-1" variant="secondary">Certified</Badge>}</div><Button variant="outline" size="sm" onClick={() => { setActiveSop(sop.id); setAnswers({}); }}>{activeSop === sop.id ? "Selected" : "Read & quiz"}</Button></div>; }) : <p className="text-sm text-muted-foreground">No SOPs have been published yet.</p>}</div>{activeSop && <div className="mt-5 rounded-md border bg-muted/30 p-4"><p className="font-semibold">{sops.find((s) => s.id === activeSop)?.title}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{sops.find((s) => s.id === activeSop)?.content || "No content added."}</p>{employee && <div className="mt-5 space-y-4">{questions.isLoading ? <p className="text-sm">Loading quiz…</p> : questions.data?.map((q, i) => <div key={q.id} className="space-y-2"><p className="text-sm font-medium">{i + 1}. {q.question}</p>{q.options.map((option, index) => <label key={option} className="flex items-center gap-2 text-sm"><input type="radio" name={q.id} checked={answers[q.id] === index} onChange={() => setAnswers((old) => ({ ...old, [q.id]: index }))} />{option}</label>)}</div>)}<Button disabled={submitQuiz.isPending || !questions.data?.length} onClick={() => submitQuiz.mutate()}><Check className="mr-2 h-4 w-4" /> Submit quiz</Button></div>}</div>}</CardContent></Card>
  </div>;
}

function PerformanceBoard({ employees }: { employees: Employee[] }) {
  const month = monthStart();
  return <div className="mt-4 grid gap-4 md:grid-cols-2">{employees.map((e) => <PerformanceCard employee={e} month={month} key={e.id} />)}</div>;
}
function PerformanceCard({ employee, month }: { employee: Employee; month: string }) {
  // Reuse the same auto-calculated business metrics visible to managers.
  const { data: records = [] } = useAttendance({ employeeId: employee.id, from: month, to: `${new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 1).toISOString().slice(0, 10)}` });
  const present = records.filter((r) => r.status === "PRESENT").length + records.filter((r) => r.status === "HALF_DAY").length * 0.5;
  const monthDays = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();
  const pct = Math.round((present / monthDays) * 100);
  return <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="font-semibold">{employee.full_name}</p><p className="text-xs text-muted-foreground">{DEPARTMENT_LABEL[employee.department] ?? employee.department} · {employee.designation ?? "Staff"}</p></div><Badge variant="outline">{monthLabel(month)}</Badge></div><div className="mt-5"><div className="mb-1 flex justify-between text-xs"><span>Attendance reliability</span><span>{pct}%</span></div><Progress value={pct} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><MetricSmall label="Present days" value={String(present)} /><MetricSmall label="Punches" value={String(records.length)} /><MetricSmall label="Status" value={employee.employment_status === "ACTIVE" ? "Active" : "Exit"} /></div></CardContent></Card>;
}
function MetricSmall({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-muted/50 p-2"><p className="text-sm font-semibold">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>; }
function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>; }
