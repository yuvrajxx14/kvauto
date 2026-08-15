import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { DEALER } from "@/lib/print";

export function PrintShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-6 print:rounded-none print:border-0 print:p-0">
        <header className="mb-4 border-b pb-3 text-center">
          <h1 className="text-xl font-bold">{DEALER.name}</h1>
          <p className="text-xs text-muted-foreground">{DEALER.tagline}</p>
          <p className="text-xs text-muted-foreground">{DEALER.address}</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide">{title}</p>
        </header>
        {children}
      </div>
    </div>
  );
}

export function PrintRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
