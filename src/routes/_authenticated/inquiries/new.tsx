import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMe } from "@/lib/auth";
import { useProfiles } from "@/lib/queries";
import { useProducts } from "@/lib/erp";
import { PageHeader } from "@/components/sales/ui";
import { StatusBadge } from "@/components/sales/badges";
import { ModelSelect } from "@/components/sales/model-select";
import { VillageSelect, TehsilSelect } from "@/components/sales/location-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CUSTOMER_TYPES,
  INTEREST_LEVELS,
  LEAD_SOURCES,
  VARIANTS,
  addDaysISO,
  fmtDate,
  todayISO,
  type InquiryStatus,
} from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/inquiries/new")({
  head: () => ({
    meta: [
      { title: "New Inquiry — KrushiVidhya Automobiles" },
      { name: "description", content: "Create a new tractor sales inquiry with duplicate customer control." },
      { property: "og:title", content: "New Inquiry — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Capture a new dealership sales inquiry." },
    ],
  }),
  component: NewInquiry,
});

type ExistingCustomer = {
  id: string;
  customer_name: string;
  mobile: string;
  village: string;
  taluka: string | null;
  customer_type: string;
};

function NewInquiry() {
  const { user } = useAuth();
  const { data: me } = useMe();
  const { data: profiles } = useProfiles();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [mobile, setMobile] = useState("");
  const [checking, setChecking] = useState(false);
  const [existing, setExisting] = useState<ExistingCustomer | null>(null);
  const [prevInquiries, setPrevInquiries] = useState<
    { id: string; inquiry_number: string; model: string; status: string; inquiry_date: string }[]
  >([]);
  const [checked, setChecked] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const { data: productList } = useProducts(true);
  const selectedHp = (productList ?? []).find((p) => p.model === selectedModel)?.hp ?? "";

  async function checkDuplicate() {
    if (!/^\d{10}$/.test(mobile.trim())) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setChecking(true);
    const { data: cust } = await supabase
      .from("customers")
      .select("id, customer_name, mobile, village, taluka, customer_type")
      .eq("mobile", mobile.trim())
      .maybeSingle();
    if (cust) {
      setExisting(cust as ExistingCustomer);
      const { data: inqs } = await supabase
        .from("inquiries")
        .select("id, inquiry_number, model, status, inquiry_date")
        .eq("customer_id", cust.id)
        .order("inquiry_date", { ascending: false });
      setPrevInquiries(inqs ?? []);
      toast.warning("Customer already exists — a new inquiry will be linked to them.");
    } else {
      setExisting(null);
      setPrevInquiries([]);
    }
    setChecked(true);
    setChecking(false);
  }

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      let customerId = existing?.id;
      const salesmanId = (fd.get("salesman_id") as string) || user!.id;

      if (!customerId) {
        const { data: cust, error } = await supabase
          .from("customers")
          .insert({
            customer_name: String(fd.get("customer_name")).trim(),
            mobile: mobile.trim(),
            village: String(fd.get("village")).trim(),
            taluka: (fd.get("taluka") as string) || null,
            customer_type: fd.get("customer_type") as never,
            assigned_salesman_id: salesmanId,
            created_by: user!.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        customerId = cust.id;
      }

      const { data: inq, error: inqErr } = await supabase
        .from("inquiries")
        .insert({
          inquiry_number: "",
          customer_id: customerId!,
          salesman_id: salesmanId,
          inquiry_date: todayISO(),
          source: String(fd.get("source")),
          model: String(fd.get("model")),
          hp: (fd.get("hp") as string) || null,
          variant: (fd.get("variant") as string) || null,
          interest_level: fd.get("interest_level") as never,
          next_followup_date: String(fd.get("next_followup_date")),
          remarks: (fd.get("remarks") as string) || null,
          created_by: user!.id,
        })
        .select("id")
        .single();
      if (inqErr) throw inqErr;
      return inq.id;
    },
    onSuccess: (id) => {
      toast.success("Inquiry created");
      qc.invalidateQueries();
      navigate({ to: "/inquiries/$inquiryId", params: { inquiryId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New Inquiry" subtitle="Customer inquiry capture with duplicate control" />

      <Card className="mb-4 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Mobile number check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                setChecked(false);
              }}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className="sm:max-w-xs"
            />
            <Button type="button" onClick={checkDuplicate} disabled={checking}>
              {checking ? "Checking…" : "Check customer"}
            </Button>
          </div>

          {checked && existing && (
            <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-warning-foreground">
                <AlertCircle className="h-4 w-4" /> Customer already exists.
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">{existing.customer_name}</span> · {existing.mobile} ·{" "}
                {existing.village} · {existing.customer_type}
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Previous inquiries
                </p>
                {prevInquiries.length === 0 && (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                )}
                {prevInquiries.map((p) => (
                  <Link
                    key={p.id}
                    to="/inquiries/$inquiryId"
                    params={{ inquiryId: p.id }}
                    className="flex items-center justify-between rounded-md bg-card px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <span>
                      {p.inquiry_number} · {p.model} · {fmtDate(p.inquiry_date)}
                    </span>
                    <StatusBadge status={p.status as InquiryStatus} />
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/customers/$customerId" params={{ customerId: existing.id }}>
                    Open existing customer
                  </Link>
                </Button>
                <span className="self-center text-xs text-muted-foreground">
                  Continue below to add a new inquiry for this customer.
                </span>
              </div>
            </div>
          )}
          {checked && !existing && (
            <p className="mt-3 text-sm text-success">
              New customer — please fill in the customer details below.
            </p>
          )}
        </CardContent>
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!checked) {
            toast.error("Run the mobile number check first");
            return;
          }
          const fd = new FormData(e.currentTarget);
          if (!fd.get("next_followup_date")) {
            toast.error("Next follow-up date is mandatory for an active inquiry");
            return;
          }
          mutation.mutate(fd);
        }}
        className="space-y-4"
      >
        {!existing && (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Customer information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer name</Label>
                <Input name="customer_name" required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Village</Label>
                <VillageSelect name="village" required />
              </div>
              <div className="space-y-1.5">
                <Label>Tehsil</Label>
                <TehsilSelect name="taluka" />
              </div>
              <div className="space-y-1.5">
                <Label>Customer type</Label>
                <Select name="customer_type" defaultValue="Farmer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {existing ? "2" : "3"}. Inquiry information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Inquiry date</Label>
              <Input value={fmtDate(todayISO())} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Salesman</Label>
              {me?.isManagement ? (
                <Select name="salesman_id" defaultValue={user?.id ?? ""}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(profiles ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input value={me?.profile?.full_name ?? ""} disabled />
                  <input type="hidden" name="salesman_id" value={user?.id ?? ""} />
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Lead source</Label>
              <Select name="source" defaultValue="Walk-in">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tractor model</Label>
              <ModelSelect name="model" onValueChange={(v) => setSelectedModel(v)} />
            </div>
            <div className="space-y-1.5">
              <Label>HP</Label>
              <Input name="hp" defaultValue={selectedHp} key={selectedHp} maxLength={20} />
            </div>

            <div className="space-y-1.5">
              <Label>Variant</Label>
              <Select name="variant" defaultValue="2WD">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIANTS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Interest level</Label>
              <Select name="interest_level" defaultValue="WARM">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEREST_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Next follow-up date *</Label>
              <Input type="date" name="next_followup_date" defaultValue={addDaysISO(2)} required />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <Label>Remarks</Label>
              <Textarea name="remarks" maxLength={1000} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/inquiries" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Create inquiry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
