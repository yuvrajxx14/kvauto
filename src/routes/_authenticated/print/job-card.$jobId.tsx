import { createFileRoute, useParams } from "@tanstack/react-router";
import { PrintShell, PrintRow } from "@/components/sales/print-shell";
import { EmptyState } from "@/components/sales/ui";
import { useProfileMap } from "@/lib/queries";
import {
  useServiceJob,
  SERVICE_STATUS_LABEL,
  SERVICE_MODE_LABEL,
  PRIORITY_LABEL,
  type ServiceStatus,
  type ServiceMode,
  type Priority,
} from "@/lib/workshop";

export const Route = createFileRoute("/_authenticated/print/job-card/$jobId")({
  head: () => ({
    meta: [
      { title: "Service job card print · KrushiVidhya Automobiles" },
      { name: "description", content: "Printable workshop job card with work done, parts and labour charges." },
      { property: "og:title", content: "Service job card · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Printable tractor service job card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobCardPrint,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function JobCardPrint() {
  const { jobId } = useParams({ from: "/_authenticated/print/job-card/$jobId" });
  const { data: job, isLoading } = useServiceJob(jobId);
  const names = useProfileMap();

  if (isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!job) return <EmptyState title="Job card not found" />;

  return (
    <PrintShell title="Service Job Card">
      <div className="grid gap-x-8 sm:grid-cols-2">
        <div>
          <PrintRow label="Job number" value={job.job_number} />
          <PrintRow label="Received" value={job.received_date} />
          <PrintRow label="Promised" value={job.promised_date ?? "—"} />
          <PrintRow
            label="Status"
            value={SERVICE_STATUS_LABEL[job.status as ServiceStatus] ?? job.status}
          />
        </div>
        <div>
          <PrintRow label="Customer" value={job.customer_name} />
          <PrintRow label="Mobile" value={job.mobile} />
          <PrintRow label="Village" value={[job.village, job.taluka].filter(Boolean).join(", ")} />
          <PrintRow label="Mechanic" value={names.get(job.assigned_to ?? "") ?? "—"} />
        </div>
        <div>
          <PrintRow label="Model" value={job.model ?? "—"} />
          <PrintRow label="Reg. / chassis" value={job.registration_number ?? job.chassis_number ?? "—"} />
          <PrintRow label="Hours" value={job.hours_reading ?? "—"} />
        </div>
        <div>
          <PrintRow
            label="Service type"
            value={job.service_type === "PROBLEM" ? `Problem — ${job.problem_category ?? "General"}` : "General service"}
          />
          <PrintRow
            label="Mode"
            value={SERVICE_MODE_LABEL[job.service_mode as ServiceMode] ?? job.service_mode}
          />
          <PrintRow label="Priority" value={PRIORITY_LABEL[job.priority as Priority] ?? job.priority} />
        </div>
      </div>

      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Complaint</h2>
        <p className="mt-1 min-h-10 whitespace-pre-wrap border-b border-dashed pb-2 text-sm">
          {job.complaint ?? "—"}
        </p>
        <h2 className="mt-3 text-sm font-semibold uppercase tracking-wide">Work done</h2>
        <p className="mt-1 min-h-10 whitespace-pre-wrap border-b border-dashed pb-2 text-sm">
          {job.work_done ?? "—"}
        </p>
        <h2 className="mt-3 text-sm font-semibold uppercase tracking-wide">Parts used</h2>
        <p className="mt-1 min-h-10 whitespace-pre-wrap border-b border-dashed pb-2 text-sm">
          {job.parts_details ?? "—"}
        </p>
      </section>

      <section className="mt-4 sm:w-1/2 sm:ml-auto">
        <PrintRow label="Parts" value={inr(Number(job.parts_amount || 0))} />
        <PrintRow label="Labour" value={inr(Number(job.labour_amount || 0))} />
        <PrintRow label="Total" value={<strong>{inr(Number(job.total_amount || 0))}</strong>} />
      </section>

      <div className="mt-10 flex justify-between text-xs">
        <span>Customer signature</span>
        <span>For {`KrushiVidhya Automobiles`}</span>
      </div>
    </PrintShell>
  );
}
