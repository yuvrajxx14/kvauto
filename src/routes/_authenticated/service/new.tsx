import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles } from "@/lib/queries";
import { useProducts } from "@/lib/erp";
import {
  PROBLEM_CATEGORIES,
  SERVICE_MODES,
  SERVICE_MODE_LABEL,
  SERVICE_PRIORITIES,
  SERVICE_TYPES,
  SERVICE_TYPE_LABEL,
  seedServiceChecklist,
} from "@/lib/service";

export const Route = createFileRoute("/_authenticated/service/new")({
  head: () => ({
    meta: [
      { title: "New Service Job · KrushiVidhya Automobiles" },
      { name: "description", content: "Open a new tractor service job card with customer, tractor and complaint details." },
      { property: "og:title", content: "New Service Job · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Create a workshop or field service job card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewServiceJobPage,
});

function NewServiceJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: staff } = useProfiles();
  const { data: products } = useProducts(true);

  const [form, setForm] = useState({
    customer_name: "",
    mobile: "",
    village: "",
    taluka: "",
    model: "",
    registration_number: "",
    chassis_number: "",
    hours_reading: "",
    service_type: "GENERAL",
    service_mode: "IN_HOUSE",
    priority: "NORMAL",
    problem_category: "",
    assigned_to: "",
    received_date: new Date().toISOString().slice(0, 10),
    promised_date: "",
    complaint: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      if (!form.customer_name.trim() || !form.mobile.trim() || !form.village.trim()) {
        throw new Error("Customer name, mobile and village are required");
      }
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        customer_name: form.customer_name.trim(),
        mobile: form.mobile.trim(),
        village: form.village.trim(),
        taluka: form.taluka.trim() || null,
        model: form.model || null,
        registration_number: form.registration_number.trim() || null,
        chassis_number: form.chassis_number.trim() || null,
        hours_reading: form.hours_reading ? Number(form.hours_reading) : null,
        service_type: form.service_type,
        service_mode: form.service_mode,
        priority: form.priority,
        problem_category: form.problem_category || null,
        assigned_to: form.assigned_to || null,
        status: form.assigned_to ? "ASSIGNED" : "OPEN",
        received_date: form.received_date,
        promised_date: form.promised_date || null,
        complaint: form.complaint.trim() || null,
        created_by: auth.user?.id ?? null,
      };
      const { data, error } = await supabase.from("service_jobs").insert(payload).select("id").single();
      if (error) throw error;
      await seedServiceChecklist(data.id);
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
      toast.success("Service job card created");
      navigate({ to: "/service/$jobId", params: { jobId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New service job card" subtitle="Record the tractor, complaint and technician" />

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Customer & tractor</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Row label="Customer name *">
            <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
          </Row>
          <Row label="Mobile *">
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </Row>
          <Row label="Village *">
            <Input value={form.village} onChange={(e) => set("village", e.target.value)} />
          </Row>
          <Row label="Taluka">
            <Input value={form.taluka} onChange={(e) => set("taluka", e.target.value)} />
          </Row>
          <Row label="Model">
            <Select value={form.model || "none"} onValueChange={(v) => set("model", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.model}>{p.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Registration number">
            <Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} />
          </Row>
          <Row label="Chassis number">
            <Input value={form.chassis_number} onChange={(e) => set("chassis_number", e.target.value)} />
          </Row>
          <Row label="Hour meter reading">
            <Input type="number" value={form.hours_reading} onChange={(e) => set("hours_reading", e.target.value)} />
          </Row>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-card">
        <CardHeader><CardTitle className="text-base">Job details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Row label="Service type">
            <Select value={form.service_type} onValueChange={(v) => set("service_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Service mode">
            <Select value={form.service_mode} onValueChange={(v) => set("service_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>{SERVICE_MODE_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Priority">
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Problem area">
            <Select value={form.problem_category || "none"} onValueChange={(v) => set("problem_category", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {PROBLEM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Assign technician">
            <Select value={form.assigned_to || "none"} onValueChange={(v) => set("assigned_to", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(staff ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Received date">
            <Input type="date" value={form.received_date} onChange={(e) => set("received_date", e.target.value)} />
          </Row>
          <Row label="Promised date">
            <Input type="date" value={form.promised_date} onChange={(e) => set("promised_date", e.target.value)} />
          </Row>
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Customer complaint</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={form.complaint}
              onChange={(e) => set("complaint", e.target.value)}
              placeholder="What is the customer reporting?"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate({ to: "/service" })}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create job card"}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
