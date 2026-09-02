import { createFileRoute } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { usePayslip, useTeamPerformance, DEPARTMENT_LABEL, monthLabel, monthStart } from "@/lib/hr";

export const Route = createFileRoute("/_authenticated/print/payslip/$payslipId")({
  head: () => ({
    meta: [
      { title: "Payslip · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable employee payslip." },
      { property: "og:title", content: "Payslip · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable employee payslip." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayslipPrint,
});

function PayslipPrint() {
  const { payslipId } = Route.useParams();
  const { data: slip, isLoading } = usePayslip(payslipId);
  const { data: team = [] } = useTeamPerformance(slip?.month_start ?? monthStart());
  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!slip) return <p className="p-6 text-sm text-muted-foreground">Payslip not found.</p>;
  const employee = slip.employee;
  const perf = team.find((r) => r.employee.id === slip.employee_id);
  return <PrintShell title="Salary Payslip"><div className="space-y-1"><PrintRow label="Pay month" value={monthLabel(slip.month_start)} /><PrintRow label="Employee" value={employee?.full_name ?? "—"} /><PrintRow label="Employee code" value={employee?.employee_code ?? "—"} /><PrintRow label="Department" value={employee ? DEPARTMENT_LABEL[employee.department] ?? employee.department : "—"} /><PrintRow label="Designation" value={employee?.designation ?? "—"} /><PrintRow label="Base salary" value={`₹${Number(slip.base_salary).toLocaleString("en-IN")}`} /><PrintRow label="Paid days" value={`${Number(slip.paid_days).toLocaleString("en-IN", { maximumFractionDigits: 1 })} / ${slip.month_days}`} /><PrintRow label="Earned salary" value={`₹${Number(slip.earned_salary).toLocaleString("en-IN")}`} /><PrintRow label="Overtime" value={`₹${Number(slip.overtime_amount).toLocaleString("en-IN")}`} /><PrintRow label="Early-arrival bonus" value={`₹${Number(slip.allowances).toLocaleString("en-IN")}`} /><PrintRow label="Late deductions" value={`₹${Number(slip.deductions).toLocaleString("en-IN")}`} /><PrintRow label="Advance" value={`₹${Number(slip.advance).toLocaleString("en-IN")}`} /><PrintRow label="Net payable" value={`₹${Number(slip.net_payable).toLocaleString("en-IN")}`} /></div>{perf && <div className="mt-4 space-y-1"><p className="text-sm font-semibold">ERP activity this month</p><PrintRow label="Inquiries logged" value={String(perf.inquiries)} /><PrintRow label="Bookings" value={String(perf.bookings)} /><PrintRow label="Deliveries" value={String(perf.deliveries)} /><PrintRow label="Service jobs (closed)" value={`${perf.serviceJobs} (${perf.serviceClosed})`} /></div>}{slip.remarks && <p className="mt-3 text-sm text-muted-foreground">Remarks: {slip.remarks}</p>}<div className="mt-12 flex justify-between text-xs text-muted-foreground"><span>Employee signature</span><span>For KrushiVidhya Automobiles</span></div></PrintShell>;
}
