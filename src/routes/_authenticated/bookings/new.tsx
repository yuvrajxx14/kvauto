import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInquiry, useProfiles } from "@/lib/queries";
import { PageHeader } from "@/components/sales/ui";
import { ModelSelect } from "@/components/sales/model-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VARIANTS } from "@/lib/sales";
import { PAYMENT_MODES, PAYMENT_MODE_LABEL, FINANCE_COMPANIES } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/bookings/new")({
  validateSearch: (search: Record<string, unknown>) => ({ inquiryId: String(search['inquiryId'] ?? "") }),
  component: NewBooking,
});

function NewBooking() {
  const { inquiryId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: inquiry, isLoading } = useInquiry(inquiryId);
  const { data: profiles } = useProfiles();
  const [financeType, setFinanceType] = useState("CASH");
  const [financeCompany, setFinanceCompany] = useState<string>(FINANCE_COMPANIES[0]);

  const create = useMutation({
    mutationFn: async (payload: {
      final_price: number;
      booking_amount: number;
      booking_date: string;
      salesman_id: string;
      remarks: string;
      tractor_model: string;
      variant: string;
      payment_mode: string;
      finance_type: string;
      loan_amount: number;
      finance_company: string | null;
    }) => {
      const { data, error } = await supabase.rpc("create_booking_atomic", {
        _inquiry_id: inquiryId,
        _final_price: payload.final_price,
        _booking_amount: payload.booking_amount,
        _booking_date: payload.booking_date,
        _salesman_id: payload.salesman_id,
        _remarks: payload.remarks,
        _tractor_model: payload.tractor_model,
        _variant: payload.variant,
        _payment_mode: payload.payment_mode,
        _finance_type: payload.finance_type,
        _loan_amount: payload.loan_amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => {
      toast.success("Booking created");
      qc.invalidateQueries();
      navigate({ to: "/bookings/$bookingId", params: { bookingId: String(id) } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading inquiry…</p>;
  if (!inquiry) return <PageHeader title="Inquiry not found" />;

  return (
    <div>
      <PageHeader
        title="Create Booking"
        subtitle={`${inquiry.inquiry_number} · ${inquiry.customer?.customer_name ?? "—"}`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/inquiries/$inquiryId" params={{ inquiryId }}><ArrowLeft className="mr-1 h-4 w-4" /> Back to inquiry</Link></Button>}
      />

      <form
        className="max-w-3xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const finalPrice = Number(fd.get("final_price"));
          const bookingAmount = Number(fd.get("booking_amount"));
          const loanAmount = financeType === "LOAN" ? Number(fd.get("loan_amount") ?? 0) : 0;
          if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
            toast.error("Enter a valid deal price");
            return;
          }
          if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
            toast.error("Enter a valid booking amount");
            return;
          }
          if (bookingAmount > finalPrice) {
            toast.error("Booking amount cannot exceed deal price");
            return;
          }
          if (financeType === "LOAN" && (!Number.isFinite(loanAmount) || loanAmount <= 0)) {
            toast.error("Enter the loan amount");
            return;
          }

          create.mutate({
            final_price: finalPrice,
            booking_amount: bookingAmount,
            booking_date: String(fd.get("booking_date")),
            salesman_id: String(fd.get("salesman_id")),
            remarks: String(fd.get("remarks") || ""),
            tractor_model: String(fd.get("tractor_model")),
            variant: String(fd.get("variant") || ""),
            payment_mode: String(fd.get("payment_mode") || "Cash"),
            finance_type: financeType,
            loan_amount: loanAmount,
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer"><Input value={inquiry.customer?.customer_name ?? ""} disabled /></Field>
          <Field label="Inquiry reference"><Input value={inquiry.inquiry_number} disabled /></Field>
          <div><Label>Tractor model</Label><ModelSelect name="tractor_model" defaultValue={inquiry.model} /></div>
          <div><Label>Variant</Label><Select name="variant" defaultValue={inquiry.variant ?? ""}><SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger><SelectContent>{VARIANTS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          <Field label="Deal price"><Input name="final_price" type="number" min="1" step="0.01" required /></Field>
          <Field label="Booking amount"><Input name="booking_amount" type="number" min="1" step="0.01" required /></Field>
          <div>
            <Label>Deal type</Label>
            <Select value={financeType} onValueChange={setFinanceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash deal</SelectItem>
                <SelectItem value="LOAN">Loan / Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {financeType === "LOAN" ? (
            <Field label="Loan amount (2% document charge applies at delivery)">
              <Input name="loan_amount" type="number" min="1" step="0.01" required />
            </Field>
          ) : (
            <div />
          )}
          <div>
            <Label>Booking payment mode</Label>
            <Select name="payment_mode" defaultValue="Cash">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{PAYMENT_MODE_LABEL[m]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Field label="Booking date"><Input name="booking_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></Field>
          <div><Label>Salesman</Label><Select name="salesman_id" defaultValue={inquiry.salesman_id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(profiles ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <Field label="Remarks"><Textarea name="remarks" maxLength={1000} /></Field>
        <Button disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Booking"}</Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
