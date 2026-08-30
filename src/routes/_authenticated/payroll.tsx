import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calculator, ChevronRight, FileText, IndianRupee, LockKeyhole, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { usePerms } from "@/lib/permissions";
import { monthLabel, monthStart, recentMonths, usePayslips, usePayrollRun, type Payslip } from "@/lib/hr";
import { PageHeader, EmptyState, KpiCard } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll · KrushiVidhya Automobiles" },
      { name: "description", content: "Generate monthly salary sheets and printable staff payslips." },
      { property: "og:title", content: "Payroll · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Monthly payroll and payslips for dealership staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayrollPage,
});

function PayrollPage() {
  const perms = usePerms();
  const { data: me } = useMe();
  const [month, setMonth] = useState(monthStart());
  const { data: run } = usePayrollRun(month);
  const { data: payslips = [], isLoading } = usePayslips(month);
  const qc = useQueryClient();
  const canManage = perms.can("payroll.manage");
  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_payroll", { _month_start: month });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Payroll generated"); qc.invalidateQueries({ queryKey: ["payroll-run", month] }); qc.invalidateQueries({ queryKey: ["payslips", month] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!perms.can("payroll.view")) return <EmptyState title="Payroll access required" hint="Ask management or accounts to grant payroll access." />;
  const total = payslips.reduce((sum, slip) => sum + Number(slip.net_payable), 0);
  const paidDays = payslips.reduce((sum, slip) => sum + Number(slip.paid_days), 0);
  return <div>
    <PageHeader title="Payroll" subtitle="Monthly salary sheet and printable payslips" actions={<div className="flex items-center gap-2"><Label htmlFor="payroll-month" className="sr-only">Payroll month</Label><Input id="payroll-month" type="month" value={month.slice(0, 7)} onChange={(e) => setMonth(`${e.target.value}-01`)} className="w-40" />{canManage && <Button onClick={() => generate.mutate()} disabled={generate.isPending}><Calculator className="mr-2 h-4 w-4" />{generate.isPending ? "Calculating…" : run ? "Regenerate" : "Generate payroll"}</Button>}</div>} />
    {!run && !isLoading && <Card className="mb-5 border-warning/40 bg-warning/5"><CardContent className="flex items-center gap-3 p-4 text-sm"><LockKeyhole className="h-4 w-4 text-warning" /><span>No salary sheet exists for {monthLabel(month)}. {canManage ? "Generate it after attendance review." : "Ask management to generate it."}</span></CardContent></Card>}
    <div className="grid gap-3 sm:grid-cols-3"><KpiCard label="Net payroll" value={`₹${total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} hint={run ? "Current salary sheet" : "Not generated"} icon={<IndianRupee className="h-4 w-4" />} tone="info" /><KpiCard label="Employees" value={payslips.length} hint="Included in sheet" icon={<FileText className="h-4 w-4" />} /><KpiCard label="Paid days" value={paidDays.toLocaleString("en-IN", { maximumFractionDigits: 1 })} hint="Across all payslips" icon={<RefreshCw className="h-4 w-4" />} tone="success" /></div>
    <Card className="mt-5"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base">Salary sheet · {monthLabel(month)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{run?.status === "FINAL" ? "Finalized payroll" : "Review before payment"}</p></div>{run && <Badge variant={run.status === "FINAL" ? "secondary" : "outline"}>{run.status}</Badge>}</CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3">Employee</th><th className="p-3">Paid days</th><th className="p-3">Earned salary</th><th className="p-3">Adjustments</th><th className="p-3">Net payable</th><th className="p-3"></th></tr></thead><tbody>{isLoading && <tr><td className="p-4" colSpan={6}>Loading salary sheet…</td></tr>}{!isLoading && !payslips.length && <tr><td className="p-4" colSpan={6}><EmptyState title="No payslips yet" hint="Generate this month’s payroll to create the salary sheet." /></td></tr>}{payslips.map((slip) => <PayslipRow key={slip.id} slip={slip} />)}</tbody></table></div></CardContent></Card>
  </div>;
}

function PayslipRow({ slip }: { slip: Payslip }) {
  const adjustments = Number(slip.allowances) - Number(slip.deductions) - Number(slip.advance) + Number(slip.overtime_amount);
  return <tr className="border-b last:border-0"><td className="p-3"><p className="font-medium">{slip.employee?.full_name ?? "Employee"}</p><p className="text-xs text-muted-foreground">{slip.employee?.employee_code ?? "—"}</p></td><td className="p-3">{Number(slip.paid_days).toLocaleString("en-IN", { maximumFractionDigits: 1 })} / {slip.month_days}</td><td className="p-3">₹{Number(slip.earned_salary).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td className="p-3">₹{adjustments.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td className="p-3 font-semibold">₹{Number(slip.net_payable).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td><td className="p-3"><Button asChild variant="ghost" size="sm"><Link to="/print/payslip/$payslipId" params={{ payslipId: slip.id }}><ChevronRight className="mr-1 h-4 w-4" /> Print</Link></Button></td></tr>;
}
