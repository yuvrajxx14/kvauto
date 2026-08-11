import { useState, type ReactNode } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_METHODS,
  INTEREST_LEVELS,
  LOST_REASONS,
  PAYMENT_MODES,
  TRACTOR_MODELS,
  VARIANTS,
  addDaysISO,
  inr,
  todayISO,
} from "@/lib/sales";

function num(v: FormDataEntryValue | null) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function Row({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const c = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[cols];
  return <div className={`grid grid-cols-1 gap-3 ${c}`}>{children}</div>;
}

function LField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ------------------------------- FOLLOW-UP -------------------------------- */

export function FollowUpDialog({
  inquiry,
  trigger,
  followupToComplete,
}: {
  inquiry: { id: string; customer_id: string; salesman_id: string; status: string };
  trigger: ReactNode;
  followupToComplete?: string;
}) {
  const [open, setOpen] = useState(false);
  const [nextDate, setNextDate] = useState(addDaysISO(3));
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const payload = {
        inquiry_id: inquiry.id,
        customer_id: inquiry.customer_id,
        salesman_id: inquiry.salesman_id,
        followup_date: String(fd.get("followup_date")),
        followup_time: (fd.get("followup_time") as string) || null,
        contact_method: fd.get("contact_method") as never,
        discussion: (fd.get("discussion") as string) || null,
        customer_response: (fd.get("customer_response") as string) || null,
        interest_level: fd.get("interest_level") as never,
        competitor_info: (fd.get("competitor_info") as string) || null,
        expected_purchase_date: (fd.get("expected_purchase_date") as string) || null,
        next_action: (fd.get("next_action") as string) || null,
        next_followup_date: (fd.get("next_followup_date") as string) || null,
        remarks: (fd.get("remarks") as string) || null,
        status: "COMPLETED" as const,
      };
      const { error } = await supabase.from("followups").insert(payload);
      if (error) throw error;

      if (followupToComplete) {
        await supabase.from("followups").update({ status: "COMPLETED" }).eq("id", followupToComplete);
      }
      if (inquiry.status === "NEW") {
        await supabase.from("inquiries").update({ status: "CONTACTED" }).eq("id", inquiry.id);
      } else if (inquiry.status === "CONTACTED" && payload.next_followup_date) {
        await supabase.from("inquiries").update({ status: "FOLLOW_UP" }).eq("id", inquiry.id);
      }
    },
    onSuccess: () => {
      toast.success("Follow-up recorded");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record follow-up</DialogTitle>
          <DialogDescription>
            Every active inquiry must carry a next follow-up date.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (!fd.get("discussion")) {
              toast.error("Enter what was discussed");
              return;
            }
            if (!fd.get("next_followup_date")) {
              toast.warning("Warning: no next follow-up date entered for an active inquiry.");
            }
            mutation.mutate(fd);
          }}
        >
          <Row cols={3}>
            <LField label="Follow-up date">
              <Input type="date" name="followup_date" defaultValue={todayISO()} required />
            </LField>
            <LField label="Time">
              <Input type="time" name="followup_time" />
            </LField>
            <LField label="Contact method">
              <Select name="contact_method" defaultValue="Phone">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LField>
          </Row>

          <LField label="Discussion">
            <Textarea name="discussion" maxLength={1000} required placeholder="What was discussed" />
          </LField>
          <LField label="Customer response">
            <Textarea name="customer_response" maxLength={1000} />
          </LField>

          <Row cols={3}>
            <LField label="Interest level">
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
            </LField>
            <LField label="Competitor info">
              <Input name="competitor_info" maxLength={120} />
            </LField>
            <LField label="Expected purchase date">
              <Input type="date" name="expected_purchase_date" />
            </LField>
          </Row>

          <Row>
            <LField label="Next action">
              <Input name="next_action" maxLength={200} placeholder="e.g. Price discussion at showroom" />
            </LField>
            <LField label="Next follow-up date">
              <Input
                type="date"
                name="next_followup_date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </LField>
          </Row>
          {!nextDate && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs font-medium text-warning-foreground">
              No next follow-up date set — this inquiry will appear in the “missing follow-up date”
              alert.
            </p>
          )}
          <LField label="Remarks">
            <Input name="remarks" maxLength={300} />
          </LField>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- DEMO ---------------------------------- */

export function DemoDialog({
  inquiry,
  trigger,
}: {
  inquiry: { id: string; customer_id: string; salesman_id: string; model: string };
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("demos").insert({
        inquiry_id: inquiry.id,
        customer_id: inquiry.customer_id,
        salesman_id: inquiry.salesman_id,
        tractor_model: String(fd.get("tractor_model")),
        demo_date: String(fd.get("demo_date")),
        location: (fd.get("location") as string) || null,
        status: "PLANNED",
        remarks: (fd.get("remarks") as string) || null,
      });
      if (error) throw error;
      await supabase
        .from("inquiries")
        .update({ status: "DEMO" })
        .eq("id", inquiry.id)
        .in("status", ["NEW", "CONTACTED", "FOLLOW_UP"]);
    },
    onSuccess: () => {
      toast.success("Demo scheduled");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan demo / field demonstration</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <LField label="Tractor model">
            <Select name="tractor_model" defaultValue={inquiry.model}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACTOR_MODELS.map((m) => (
                  <SelectItem key={m.model} value={m.model}>
                    {m.model} · {m.hp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LField>
          <Row>
            <LField label="Demo date">
              <Input type="date" name="demo_date" defaultValue={addDaysISO(1)} required />
            </LField>
            <LField label="Location / village">
              <Input name="location" maxLength={120} required />
            </LField>
          </Row>
          <LField label="Remarks">
            <Textarea name="remarks" maxLength={500} />
          </LField>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Schedule demo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteDemoDialog({
  demo,
  trigger,
}: {
  demo: { id: string; inquiry_id: string };
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase
        .from("demos")
        .update({
          status: "COMPLETED",
          feedback: String(fd.get("feedback")),
          competitor_present: (fd.get("competitor_present") as string) || null,
          next_action: String(fd.get("next_action")),
        })
        .eq("id", demo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demo completed");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete demo</DialogTitle>
          <DialogDescription>Customer feedback and next action are required.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <LField label="Customer feedback">
            <Textarea name="feedback" required maxLength={1000} />
          </LField>
          <LField label="Competitor present">
            <Input name="competitor_present" maxLength={120} />
          </LField>
          <LField label="Next action">
            <Input name="next_action" required maxLength={200} />
          </LField>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Mark completed
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ NEGOTIATION ------------------------------- */

export function NegotiationDialog({
  inquiry,
  trigger,
}: {
  inquiry: { id: string; model: string };
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [values, setValues] = useState({
    quoted_price: 0,
    discount: 0,
    exchange_value: 0,
    subsidy: 0,
  });
  const finalPrice =
    values.quoted_price - values.discount - values.exchange_value - values.subsidy;

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("negotiations").insert({
        inquiry_id: inquiry.id,
        tractor_model: String(fd.get("tractor_model") || inquiry.model),
        quoted_price: values.quoted_price,
        discount: values.discount,
        accessories: (fd.get("accessories") as string) || null,
        exchange_value: values.exchange_value,
        finance: num(fd.get("finance")),
        subsidy: values.subsidy,
        final_expected_price: finalPrice,
        customer_demand: num(fd.get("customer_demand")) || null,
        competitor_quote: (fd.get("competitor_quote") as string) || null,
        remarks: (fd.get("remarks") as string) || null,
        created_by: user!.id,
      });
      if (error) throw error;
      await supabase
        .from("inquiries")
        .update({ status: "NEGOTIATION" })
        .eq("id", inquiry.id)
        .in("status", ["NEW", "CONTACTED", "FOLLOW_UP", "DEMO"]);
    },
    onSuccess: () => {
      toast.success("Quotation recorded — history preserved");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New quotation / negotiation entry</DialogTitle>
          <DialogDescription>
            Previous quotations are never overwritten — each revision is kept in history.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (values.quoted_price <= 0) {
              toast.error("Enter a quoted price");
              return;
            }
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <LField label="Tractor model">
            <Input name="tractor_model" defaultValue={inquiry.model} maxLength={80} />
          </LField>
          <Row cols={3}>
            <LField label="Quoted price (₹)">
              <Input
                type="number"
                min={0}
                required
                value={values.quoted_price || ""}
                onChange={(e) => setValues((v) => ({ ...v, quoted_price: num(e.target.value) }))}
              />
            </LField>
            <LField label="Discount (₹)">
              <Input
                type="number"
                min={0}
                value={values.discount || ""}
                onChange={(e) => setValues((v) => ({ ...v, discount: num(e.target.value) }))}
              />
            </LField>
            <LField label="Exchange value (₹)">
              <Input
                type="number"
                min={0}
                value={values.exchange_value || ""}
                onChange={(e) => setValues((v) => ({ ...v, exchange_value: num(e.target.value) }))}
              />
            </LField>
          </Row>
          <Row cols={3}>
            <LField label="Finance amount (₹)">
              <Input type="number" min={0} name="finance" />
            </LField>
            <LField label="Subsidy (₹)">
              <Input
                type="number"
                min={0}
                value={values.subsidy || ""}
                onChange={(e) => setValues((v) => ({ ...v, subsidy: num(e.target.value) }))}
              />
            </LField>
            <LField label="Customer demand (₹)">
              <Input type="number" min={0} name="customer_demand" />
            </LField>
          </Row>
          <Row>
            <LField label="Accessories">
              <Input name="accessories" maxLength={200} placeholder="Trolley, rotavator…" />
            </LField>
            <LField label="Competitor quotation">
              <Input name="competitor_quote" maxLength={200} />
            </LField>
          </Row>
          <LField label="Remarks">
            <Textarea name="remarks" maxLength={500} />
          </LField>

          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Final expected price
            </p>
            <p className="text-xl font-bold text-primary">{inr(finalPrice)}</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Save quotation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- BOOKING -------------------------------- */

export function BookingDialog({
  inquiry,
  latestPrice,
  trigger,
}: {
  inquiry: {
    id: string;
    customer_id: string;
    salesman_id: string;
    model: string;
    variant: string | null;
    exchange_required: boolean;
    finance_required: boolean;
    subsidy_required: boolean;
  };
  latestPrice: number;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          booking_number: "",
          inquiry_id: inquiry.id,
          customer_id: inquiry.customer_id,
          salesman_id: inquiry.salesman_id,
          booking_date: String(fd.get("booking_date")),
          tractor_model: String(fd.get("tractor_model")),
          variant: (fd.get("variant") as string) || null,
          final_price: num(fd.get("final_price")),
          booking_amount: num(fd.get("booking_amount")),
          payment_mode: (fd.get("payment_mode") as never) || null,
          expected_delivery_date: (fd.get("expected_delivery_date") as string) || null,
          finance_required: fd.get("finance_required") === "on",
          finance_company: (fd.get("finance_company") as string) || null,
          exchange_required: fd.get("exchange_required") === "on",
          exchange_details: (fd.get("exchange_details") as string) || null,
          subsidy_required: fd.get("subsidy_required") === "on",
          remarks: (fd.get("remarks") as string) || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Booking created — inquiry moved to BOOKED");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert inquiry to booking</DialogTitle>
          <DialogDescription>
            Customer, salesman and tractor requirement are carried forward automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (num(fd.get("final_price")) <= 0) {
              toast.error("Enter the final price");
              return;
            }
            mutation.mutate(fd);
          }}
        >
          <Row cols={3}>
            <LField label="Booking date">
              <Input type="date" name="booking_date" defaultValue={todayISO()} required />
            </LField>
            <LField label="Tractor model">
              <Input name="tractor_model" defaultValue={inquiry.model} required maxLength={80} />
            </LField>
            <LField label="Variant">
              <Select name="variant" defaultValue={inquiry.variant ?? "2WD"}>
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
            </LField>
          </Row>
          <Row cols={3}>
            <LField label="Final price (₹)">
              <Input type="number" min={1} name="final_price" defaultValue={latestPrice || ""} required />
            </LField>
            <LField label="Booking amount (₹)">
              <Input type="number" min={0} name="booking_amount" required />
            </LField>
            <LField label="Payment mode">
              <Select name="payment_mode" defaultValue="Cash">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LField>
          </Row>
          <Row>
            <LField label="Expected delivery date">
              <Input type="date" name="expected_delivery_date" defaultValue={addDaysISO(10)} />
            </LField>
            <LField label="Finance company">
              <Input name="finance_company" maxLength={120} />
            </LField>
          </Row>
          <div className="flex flex-wrap gap-4 rounded-md bg-muted px-3 py-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="finance_required" defaultChecked={inquiry.finance_required} /> Finance
              required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="exchange_required" defaultChecked={inquiry.exchange_required} />{" "}
              Exchange required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="subsidy_required" defaultChecked={inquiry.subsidy_required} /> Subsidy
              required
            </label>
          </div>
          <LField label="Exchange tractor details">
            <Input name="exchange_details" maxLength={200} placeholder="Brand, model, year, condition" />
          </LField>
          <LField label="Remarks">
            <Textarea name="remarks" maxLength={500} />
          </LField>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Create booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- PAYMENT -------------------------------- */

export function PaymentDialog({ bookingId, trigger }: { bookingId: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const amount = num(fd.get("amount"));
      if (amount <= 0) throw new Error("Amount must be greater than zero");
      const { error } = await supabase.from("booking_payments").insert({
        booking_id: bookingId,
        amount,
        payment_date: String(fd.get("payment_date")),
        payment_mode: fd.get("payment_mode") as never,
        reference_number: (fd.get("reference_number") as string) || null,
        remarks: (fd.get("remarks") as string) || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded — balance updated");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record booking payment</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <Row>
            <LField label="Amount (₹)">
              <Input type="number" min={1} name="amount" required />
            </LField>
            <LField label="Payment date">
              <Input type="date" name="payment_date" defaultValue={todayISO()} required />
            </LField>
          </Row>
          <Row>
            <LField label="Payment mode">
              <Select name="payment_mode" defaultValue="Cash">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LField>
            <LField label="Reference number">
              <Input name="reference_number" maxLength={60} />
            </LField>
          </Row>
          <LField label="Remarks">
            <Input name="remarks" maxLength={200} />
          </LField>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Add payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- ALLOCATION ------------------------------- */

export function AllocateTractorDialog({
  booking,
  trigger,
}: {
  booking: { id: string; customer_id: string; tractor_model: string };
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stock } = useQuery({
    queryKey: ["stock", "available"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tractor_stock")
        .select("*")
        .eq("status", "AVAILABLE")
        .order("model");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (stock ?? []).filter((t) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return [t.chassis_number, t.engine_number, t.model, t.variant ?? ""].some((v) =>
      v.toLowerCase().includes(s),
    );
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const tractor = (stock ?? []).find((t) => t.id === selected);
      if (!tractor) throw new Error("Select a tractor");
      const { error } = await supabase.from("tractor_allocations").insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        tractor_stock_id: tractor.id,
        chassis_number: tractor.chassis_number,
        engine_number: tractor.engine_number,
        model: tractor.model,
        variant: tractor.variant,
        allocated_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tractor allocated and reserved");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Allocate tractor</DialogTitle>
          <DialogDescription>
            Only tractors with stock status AVAILABLE can be allocated. Allocation reserves the unit.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search chassis, engine, model or variant"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No available tractors in stock. Stock is maintained by the Inventory module.
            </p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selected === t.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <p className="font-semibold">
                {t.model} {t.variant ? `· ${t.variant}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Chassis {t.chassis_number} · Engine {t.engine_number}
              </p>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selected || mutation.isPending}
          >
            Allocate tractor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------- LOST --------------------------------- */

export function LostDialog({ inquiryId, trigger }: { inquiryId: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("lost_inquiries").insert({
        inquiry_id: inquiryId,
        lost_reason: String(fd.get("lost_reason")),
        competitor: (fd.get("competitor") as string) || null,
        lost_date: String(fd.get("lost_date")),
        remarks: (fd.get("remarks") as string) || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inquiry marked as lost — full history retained");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark inquiry as lost</DialogTitle>
          <DialogDescription>
            The inquiry and its complete follow-up history are retained, never deleted.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <LField label="Lost reason">
            <Select name="lost_reason" defaultValue="Price">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LField>
          <Row>
            <LField label="Lost date">
              <Input type="date" name="lost_date" defaultValue={todayISO()} required />
            </LField>
            <LField label="Competitor brand / model">
              <Input name="competitor" maxLength={120} />
            </LField>
          </Row>
          <LField label="Remarks">
            <Textarea name="remarks" required maxLength={500} />
          </LField>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              Mark as lost
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
