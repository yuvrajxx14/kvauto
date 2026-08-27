import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Database, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/system/")({
  head: () => ({
    meta: [
      { title: "Backend status · KrushiVidhya Automobiles" },
      { name: "description", content: "Live backend status for the dealership ERP: which database powers the app, connection health and record counts." },
      { property: "og:title", content: "Backend status · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Which database the dealership ERP is connected to, plus live health and record counts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemPage,
});

const COUNT_TABLES = [
  "customers",
  "inquiries",
  "bookings",
  "tractor_stock",
  "deliveries",
  "service_jobs",
  "products",
  "villages",
] as const;

function SystemPage() {
  const health = useQuery({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const started = performance.now();
      const { error } = await supabase.from("products").select("id", { head: true, count: "exact" });
      const latency = Math.round(performance.now() - started);
      if (error) throw error;
      return { latency };
    },
    refetchInterval: 60_000,
  });

  const counts = useQuery({
    queryKey: ["backend-counts"],
    queryFn: async () => {
      const rows = await Promise.all(
        COUNT_TABLES.map(async (t) => {
          const { count, error } = await supabase.from(t).select("id", { head: true, count: "exact" });
          return { table: t, count: error ? null : (count ?? 0) };
        }),
      );
      return rows;
    },
  });

  const online = health.isSuccess;

  return (
    <div>
      <PageHeader
        title="Backend status"
        description="Which database this dealership system is running on, and whether it is reachable right now."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              health.refetch();
              counts.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Re-check
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" /> Active database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Provider" value={<span className="font-semibold">Lovable Cloud</span>} />
            <Row label="Engine" value="PostgreSQL (managed)" />
            <Row label="Environment" value={import.meta.env.DEV ? "Preview / development" : "Published / live"} />
            <Row
              label="Connection"
              value={
                health.isPending ? (
                  <span className="text-muted-foreground">Checking…</span>
                ) : online ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Connected ({health.data?.latency} ms)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                    <XCircle className="h-4 w-4" /> Unreachable
                  </span>
                )
              }
            />
            <Row label="Auth, storage & files" value="Handled by the same Lovable Cloud backend" />
            <Row label="External database" value="Not connected" />
            <p className="pt-2 text-xs text-muted-foreground">
              All dealership records — customers, inquiries, bookings, stock, service and accounts — are stored in this
              single Lovable Cloud database. No other database is in use by this application.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={online ? "default" : "destructive"} className="text-sm">
              {health.isPending ? "Checking" : online ? "All systems operational" : "Backend error"}
            </Badge>
            {health.isError && (
              <p className="mt-3 text-xs text-destructive">{(health.error as Error).message}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Re-checked automatically every minute.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live record counts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(counts.data ?? []).map((r) => (
                <TableRow key={r.table}>
                  <TableCell className="capitalize">{r.table.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right font-medium">
                    {r.count === null ? "—" : r.count}
                  </TableCell>
                </TableRow>
              ))}
              {counts.isPending && (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                    Loading counts…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
