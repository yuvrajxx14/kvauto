import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { ModelSelect } from "@/components/sales/model-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/lib/auth";
import { useProfiles, useProfileMap } from "@/lib/queries";
import {
  useServiceJobs,
  sortServiceJobs,
  isOverdue,
  OPEN_STATUSES,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  SERVICE_MODES,
  SERVICE_MODE_LABEL,
  PROBLEM_CATEGORIES,
  PRIORITIES,
  PRIORITY_LABEL,
  type ServiceStatus,
  type ServiceMode,
  type Priority,
} from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/workshop/service/")({
  head: () => ({
    meta: [
      { title: "Service register · KrushiVidhya Automobiles" },
      {
        name: "description",
        content: "Workshop service register for Mahindra tractors — general service and priority problem job cards.",
      },
      { property: "og:title", content: "Service register · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Track every tractor service job card from open to delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiceRegisterPage,
});

function ServiceRegisterPage() {
  const { data: me } = useMe();
  const { data: jobs, isLoading } = useServiceJobs();
  const { data: staff } = useProfiles();
  const names = useProfileMap();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"PROBLEM" | "GENERAL" | "all">("PROBLEM");
  const [status, setStatus] = useState<string>("open");
  const [mechanic, setMechanic] = useState<string>("all");
  const [village, setVillage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState<"GENERAL" | "PROBLEM">("PROBLEM");

  const canEdit = !!(me?.isWorkshop || me?.isManagement);
  const all = jobs ?? [];
  const villages = [...new Set(all.map((j) => j.village).filter(Boolean))].sort();

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const type = String(form.get("service_type"));
      const payload = {
        job_number: "",
        customer_name: String(form.get("customer_name") ?? "").trim(),
        mobile: String(form.get("mobile") ?? "").trim(),
        village: String(form.get("village") ?? "").trim(),
        taluka: String(form.get("taluka") ?? "").trim() || null,
        model: String(form.get("model") ?? "") || null,
        registration_number: String(form.get("registration_number") ?? "").trim() || null,
        chassis_number: String(form.get("chassis_number") ?? "").trim() || null,
        hours_reading: form.get("hours_reading") ? Number(form.get("hours_reading")) : null,
        service_type: type,
        problem_category: type === "PROBLEM" ? String(form.get("problem_category") ?? "") || null : null,
        service_mode: String(form.get("service_mode") ?? "IN_HOUSE"),
        priority: String(form.get("priority") ?? "NORMAL"),
        assigned_to: String(form.get("assigned_to") ?? "") || null,
        promised_date: String(form.get("promised_date") ?? "") || null,
        complaint: String(form.get("complaint") ?? "").trim() || null,
      };
      if (!payload.customer_name || !payload.mobile || !payload.village) {
        throw new Error("Customer name, mobile and village are required");
      }
      const { error } = await supabase.from("service_jobs").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job card created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const filtered = sortServiceJobs(
    all.filter((j) => {
      if (tab !== "all" && j.service_type !== tab) return false;
      if (status === "open" && !OPEN_STATUSES.includes(j.status as ServiceStatus)) return false;
      if (status !== "open" && status !== "all" && j.status !== status) return false;
      if (mechanic !== "all" && j.assigned_to !== mechanic) return false;
      if (village !== "all" && j.village !== village) return false;
      if (
        term &&
        ![j.customer_name, j.mobile, j.chassis_number, j.registration_number, j.job_number, j.village]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      )
        return false;
      return true;
    }),
  );

  if (me && !me.isWorkshop) {
    return (
      <div>
        <PageHeader title="Service register" subtitle="Workshop job cards" />
        <EmptyState title="Workshop access only" hint="Ask the dealer or a manager to assign you a workshop role." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Service register"
        subtitle="Problem complaints are served first, general service follows."
        actions={
          canEdit && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New job card
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="PROBLEM">Problem / Complaint</TabsTrigger>
          <TabsTrigger value="GENERAL">General service</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search customer, mobile, chassis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open jobs</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            {SERVICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{SERVICE_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mechanic} onValueChange={setMechanic}>
          <SelectTrigger><SelectValue placeholder="Mechanic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All mechanics</SelectItem>
            {(staff ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={village} onValueChange={setVillage}>
          <SelectTrigger><SelectValue placeholder="Village" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All villages</SelectItem>
            {villages.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading job cards…</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="No job cards" hint="Create a job card when a tractor comes in or a complaint is logged." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Tractor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Mechanic</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j) => (
                  <TableRow key={j.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to="/workshop/service/$jobId" params={{ jobId: j.id }} className="hover:underline">
                        {j.job_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {j.promised_date ? `Promised ${j.promised_date}` : `Received ${j.received_date}`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{j.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {j.mobile} · {j.village}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {j.model ?? "—"}
                      <br />
                      {j.registration_number ?? j.chassis_number ?? ""}
                    </TableCell>
                    <TableCell>
                      {j.service_type === "PROBLEM" ? (
                        <Badge variant="destructive">{j.problem_category ?? "Problem"}</Badge>
                      ) : (
                        <Badge variant="secondary">General</Badge>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {SERVICE_MODE_LABEL[j.service_mode as ServiceMode] ?? j.service_mode} ·{" "}
                        {PRIORITY_LABEL[j.priority as Priority] ?? j.priority}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {names.get(j.assigned_to ?? "") ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOverdue(j) ? "destructive" : "outline"}>
                        {SERVICE_STATUS_LABEL[j.status as ServiceStatus] ?? j.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New service job card</DialogTitle>
          </DialogHeader>
          <form
            id="job-form"
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(new FormData(e.currentTarget));
            }}
          >
            <div>
              <Label htmlFor="customer_name">Customer name</Label>
              <Input id="customer_name" name="customer_name" required />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" name="mobile" required />
            </div>
            <div>
              <Label htmlFor="village">Village</Label>
              <Input id="village" name="village" required />
            </div>
            <div>
              <Label htmlFor="taluka">Taluka</Label>
              <Input id="taluka" name="taluka" />
            </div>
            <div>
              <Label>Model</Label>
              <ModelSelect />
            </div>
            <div>
              <Label htmlFor="registration_number">Registration / chassis no.</Label>
              <Input id="registration_number" name="registration_number" />
            </div>
            <div>
              <Label htmlFor="hours_reading">Hours reading</Label>
              <Input id="hours_reading" name="hours_reading" type="number" step="0.1" />
            </div>
            <div>
              <Label>Service type</Label>
              <Select
                name="service_type"
                value={serviceType}
                onValueChange={(v) => setServiceType(v as "GENERAL" | "PROBLEM")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General service</SelectItem>
                  <SelectItem value="PROBLEM">Problem / Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {serviceType === "PROBLEM" && (
              <div>
                <Label>Problem category</Label>
                <Select name="problem_category" defaultValue={PROBLEM_CATEGORIES[0]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROBLEM_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Service mode</Label>
              <Select name="service_mode" defaultValue="IN_HOUSE">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{SERVICE_MODE_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select name="priority" defaultValue={serviceType === "PROBLEM" ? "HIGH" : "NORMAL"} key={serviceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign mechanic</Label>
              <Select name="assigned_to">
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {(staff ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="promised_date">Promised date</Label>
              <Input id="promised_date" name="promised_date" type="date" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="complaint">Complaint / work requested</Label>
              <Textarea id="complaint" name="complaint" rows={3} />
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="job-form" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Create job card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
