import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PIPELINE, STATUS_LABEL, type InquiryStatus } from "@/lib/sales";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "danger" | "warning" | "success" | "info";
  onClick?: () => void;
}) {
  const toneClass = {
    default: "text-foreground",
    danger: "text-destructive",
    warning: "text-warning",
    success: "text-success",
    info: "text-info",
  }[tone];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "shadow-card transition-shadow",
        onClick && "cursor-pointer hover:shadow-raised",
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("stat-value mt-1", toneClass)}>{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && <div className={cn("shrink-0 rounded-md bg-muted p-2", toneClass)}>{icon}</div>}
      </CardContent>
    </Card>
  );
}

export function PipelineStepper({ status }: { status: InquiryStatus }) {
  const lost = status === "LOST";
  const activeIndex = lost ? -1 : PIPELINE.indexOf(status);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PIPELINE.map((s, i) => {
        const done = !lost && i < activeIndex;
        const current = !lost && i === activeIndex;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                current && "bg-primary text-primary-foreground shadow-card",
                done && "bg-success/15 text-success",
                !current && !done && "bg-muted text-muted-foreground",
              )}
            >
              {STATUS_LABEL[s]}
            </span>
            {i < PIPELINE.length - 1 && <span className="text-muted-foreground/50">›</span>}
          </div>
        );
      })}
      {lost && (
        <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
          Lost
        </span>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}
