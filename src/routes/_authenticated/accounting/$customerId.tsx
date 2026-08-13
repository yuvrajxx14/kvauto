import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLedger, ledgerTotals } from "@/lib/erp";
import { LEDGER_TYPE_LABEL } from "@/lib/booking";
import { fmtDate, inr } from "@/lib/sales";

export const Route = createFileRoute("/_authenticated/accounting/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer ledger \u00b7 KrushiVidhya Automobiles" },
      { name: "description", content: "Running ledger of deal value, payments and outstanding balance for a customer." },
      { property: "og:title", content: "Customer ledger \u00b7 KrushiVidhya Automobiles" },
      { property: "og:description", content: "Deal value, payments and outstanding balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

function LedgerPage() {
  const { customerId } = Route.useParams();
  const { data: entries, isLoading } = useLedger(customerId);
  const { data: customer } = useQuery({
    queryKey: ["customer-basic", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, customer_name, mobile, village").eq("id", customerId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rows = entries ?? [];
  const totals = ledgerTotals(rows);
  let running = 0;

  return (
    <div>
      <PageHeader
        title={customer?.customer_name ? `Ledger \u00b7 ${customer.customer_name}` : "Customer ledger"}
        subtitle={customer ? `${customer.mobile} · ${customer.village}` : ""}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/accounting"><ArrowLeft className="mr-1 h-4 w-4" /> Accounting</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Total billed" value={inr(totals.debit)} />
        <Metric label="Total received" value={inr(totals.credit)} />
        <Metric label="Outstanding" value={inr(Math.max(0, totals.outstanding))} />
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Ledger entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Loading\u2026</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No ledger entries.</TableCell></TableRow>}
              {rows.map((e) => {
                const amt = Number(e.amount);
                running += e.direction === "DEBIT" ? amt : -amt;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{fmtDate(e.entry_date)}</TableCell>
                    <TableCell>
                      <p className="text-sm">{LEDGER_TYPE_LABEL[e.txn_type] ?? e.txn_type}</p>
                      <p className="text-xs text-muted-foreground">{e.remarks || e.reference_number || ""}</p>
                    </TableCell>
                    <TableCell className="text-xs">{e.booking?.booking_number ?? "\u2014"}</TableCell>
                    <TableCell className="text-right">{e.direction === "DEBIT" ? inr(amt) : "\u2014"}</TableCell>
                    <TableCell className="text-right">{e.direction === "CREDIT" ? inr(amt) : "\u2014"}</TableCell>
                    <TableCell className="text-right font-medium">{inr(running)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
