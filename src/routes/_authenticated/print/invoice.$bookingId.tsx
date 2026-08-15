import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBooking, useTaxInvoice } from "@/lib/erp";
import { DEALER, amountInWords, amountInWordsPaise } from "@/lib/print";
import { fmtDate, todayISO } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/print/invoice/$bookingId")({
  head: () => ({
    meta: [
      { title: "Tax invoice · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable GST tax invoice for RTO passing with chassis, engine, tax breakup and amount in words." },
      { property: "og:title", content: "Tax invoice · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable GST tax invoice for RTO passing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoicePrint,
});

function money(n: number) {
  return Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InvoicePrint() {
  const { bookingId } = Route.useParams();
  const qc = useQueryClient();
  const { data: b } = useBooking(bookingId);
  const { data: inv, isLoading } = useTaxInvoice(bookingId);

  const alloc = Array.isArray(b?.allocation) ? b?.allocation[0] : b?.allocation;
  const [rate, setRate] = useState("");
  const [gst, setGst] = useState("5");
  const [date, setDate] = useState(todayISO());
  const [hpa, setHpa] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");

  const issue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("issue_tax_invoice", {
        _booking_id: bookingId,
        _invoice_date: date,
        _rate: Number(rate),
        _gst_rate: Number(gst),
        _hpa_hypo: hpa,
        _buyer_address: address,
        _buyer_gstin: gstin,
        _place_of_supply: "24-Gujarat",
        _hsn_code: "87019200",
        _description: `MAHINDRA ${b?.tractor_model ?? ""} ${b?.variant ?? ""}`.trim(),
        _prefix: "A",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice generated");
      qc.invalidateQueries({ queryKey: ["tax-invoice", bookingId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!b || isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  if (!inv) {
    return (
      <div className="mx-auto max-w-lg space-y-3 p-6">
        <h1 className="page-title">Generate tax invoice</h1>
        <p className="text-sm text-muted-foreground">
          {b.booking_number} · {b.customer?.customer_name} · {b.tractor_model}
        </p>
        <div><Label>Invoice date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div>
          <Label>Taxable value (rate before GST)</Label>
          <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="592868" />
        </div>
        <div><Label>GST %</Label><Input type="number" value={gst} onChange={(e) => setGst(e.target.value)} /></div>
        <div><Label>HPA / Hypothecation</Label><Input value={hpa} onChange={(e) => setHpa(e.target.value)} placeholder="L & T FINANCE LTD." /></div>
        <div><Label>Billing address (optional override)</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div><Label>Buyer GSTIN (optional)</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">
          Invoice number is generated automatically as A/&lt;financial year&gt;/&lt;month&gt;/&lt;serial&gt; and the serial restarts each month.
        </p>
        <Button disabled={!rate || issue.isPending} onClick={() => issue.mutate()}>
          {issue.isPending ? "Generating…" : "Generate invoice"}
        </Button>
      </div>
    );
  }

  const gstAmount = Number(inv.cgst) + Number(inv.sgst);

  return (
    <div className="mx-auto max-w-4xl p-6 text-foreground print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
      </div>

      <div className="border border-foreground text-[12px] leading-tight">
        <div className="border-b border-foreground px-2 py-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{DEALER.name}</h1>
          <p>{DEALER.address}</p>
          <p>Mo. : {DEALER.phone}</p>
        </div>

        <div className="grid grid-cols-3 border-b border-foreground">
          <div className="border-r border-foreground px-2 py-1 font-semibold">Debit Memo</div>
          <div className="border-r border-foreground px-2 py-1 text-center font-bold">TAX INVOICE</div>
          <div className="px-2 py-1 text-right font-semibold">Original</div>
        </div>

        <div className="grid grid-cols-2 border-b border-foreground">
          <div className="border-r border-foreground p-2">
            <p className="text-[10px] font-semibold">Name &amp; Address of the Receipiant (Billed To)</p>
            <p className="text-base font-bold uppercase">{inv.buyer_name}</p>
            <p className="uppercase">{inv.buyer_address}</p>
            <p className="mt-3">Mobile No. : <span className="font-semibold">{inv.buyer_mobile ?? "—"}</span></p>
            <p>GSTIN No. : <span className="font-semibold">{inv.buyer_gstin ?? ""}</span></p>
            <p>Place of Supply : <span className="font-semibold">{inv.place_of_supply}</span></p>
          </div>
          <div className="p-2">
            <p>Invoice No. : <span className="font-bold">{inv.invoice_number}</span></p>
            <p>Date : <span className="font-bold">{fmtDate(inv.invoice_date)}</span></p>
            <p className="mt-3">HPA/HYPO : <span className="font-bold uppercase">{inv.hpa_hypo ?? "—"}</span></p>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground text-center font-semibold">
              <th className="border-r border-foreground px-1 py-1">Sr</th>
              <th className="border-r border-foreground px-1 py-1">Description of Goods</th>
              <th className="border-r border-foreground px-1 py-1">HSN/SAC</th>
              <th className="border-r border-foreground px-1 py-1">Quantity</th>
              <th className="border-r border-foreground px-1 py-1">Rate</th>
              <th className="border-r border-foreground px-1 py-1">GST%</th>
              <th className="px-1 py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="h-64 border-r border-foreground px-1 py-1 text-center">1</td>
              <td className="border-r border-foreground px-2 py-1 font-semibold uppercase">
                {inv.description}
                <div className="mt-1">Chassis No. : {inv.chassis_number ?? "—"}</div>
                <div>Engine No. : {inv.engine_number ?? "—"}</div>
              </td>
              <td className="border-r border-foreground px-1 py-1 text-center">{inv.hsn_code}</td>
              <td className="border-r border-foreground px-1 py-1 text-right">{Number(inv.quantity).toFixed(2)}</td>
              <td className="border-r border-foreground px-1 py-1 text-right">{money(Number(inv.rate))}</td>
              <td className="border-r border-foreground px-1 py-1 text-right">{Number(inv.gst_rate).toFixed(2)}</td>
              <td className="px-1 py-1 text-right">{money(Number(inv.taxable_value))}</td>
            </tr>
            <tr className="border-y border-foreground font-semibold">
              <td className="border-r border-foreground" />
              <td className="border-r border-foreground" />
              <td className="border-r border-foreground" />
              <td className="border-r border-foreground px-1 py-1 text-right">{Number(inv.quantity).toFixed(2)}</td>
              <td className="border-r border-foreground" />
              <td className="border-r border-foreground" />
              <td className="px-1 py-1 text-right">{money(Number(inv.taxable_value))}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2">
          <div className="border-r border-foreground">
            <div className="border-b border-foreground px-2 py-1">
              <span className="font-semibold">GST Amount (in words) : </span>
              <span className="italic">{amountInWordsPaise(gstAmount)}</span>
            </div>
            <div className="border-b border-foreground px-2 py-1">
              <span className="font-semibold">Bill Amount (in words) : </span>
              <span className="italic">{amountInWords(Number(inv.grand_total)).replace(" Rupees Only", " Only")}</span>
            </div>
            <div className="px-2 py-1">
              <p className="font-semibold">Our Bankers :</p>
              <p>Bank Name : {DEALER.bank.name}</p>
              <p>Branch Name : {DEALER.bank.branch}</p>
              <p>Account No. : {DEALER.bank.account}</p>
              <p>IFSC Code : {DEALER.bank.ifsc}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between border-b border-foreground px-2 py-1 font-semibold">
              <span>Taxable Value</span><span>{money(Number(inv.taxable_value))}</span>
            </div>
            <div className="flex justify-between border-b border-foreground px-2 py-1">
              <span>CGST</span><span>{(Number(inv.gst_rate) / 2).toFixed(2)}%</span><span>{money(Number(inv.cgst))}</span>
            </div>
            <div className="flex justify-between border-b border-foreground px-2 py-1">
              <span>SGST</span><span>{(Number(inv.gst_rate) / 2).toFixed(2)}%</span><span>{money(Number(inv.sgst))}</span>
            </div>
            <div className="flex justify-between border-b border-foreground px-2 py-1">
              <span>Round Off</span><span>{money(Number(inv.round_off))}</span>
            </div>
            <div className="flex justify-between px-2 py-2 text-base font-bold">
              <span>Grand Total</span><span>{money(Number(inv.grand_total))}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-foreground">
          <div className="border-r border-foreground p-2 text-[10px]">
            <p className="text-[11px] font-semibold">Terms &amp; Condition :</p>
            <p>1. Goods once sold will not be taken back.</p>
            <p>2. Interest @18% p.a. will be charged if payment is not received within Due date</p>
            <p>3. Our risk and responsibility ceases as soon as the material leaves our premises.</p>
            <p>4. Subject To {DEALER.jurisdiction} Jurisdiction Only. E. &amp; O.E.</p>
          </div>
          <div className="flex flex-col justify-between p-2 text-right">
            <p className="font-semibold">For, {DEALER.name}</p>
            <p className="mt-12 text-[10px]">(Authorised Signatory)</p>
          </div>
        </div>

        <div className="border-t border-foreground px-2 py-1 font-bold">
          Company&apos;s GSTIN No. : {DEALER.gstin}
        </div>
      </div>
    </div>
  );
}
