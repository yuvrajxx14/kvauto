import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, inr } from "@/lib/sales";
import {
  SPARE_NEXT,
  SPARE_STATUS_LABEL,
  SPARE_TYPE_LABEL,
  derivedStatus,
  issuedValue,
  requestedValue,
  spareStatusTone,
  useSpareRequest,
  type SpareItem,
  type SpareStatus,
} from "@/lib/spares";

export const Route = createFileRoute("/_authenticated/spares/$requestId")({
  head: () => ({
    meta: [
      { title: "Spare Parts Requirement · KrushiVidhya Automobiles" },
      { name: "description", content: "Approve and issue the spare parts demanded by a mechanic or customer." },
      { property: "og:title", content: "Spare Parts Requirement · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Spare counter view of a parts requirement, line by line." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpareRequestDetailPage,
});

function SpareRequestDetailPage() {
  const { requestId } = Route.useParams();
  const qc = useQueryClient();
  const { data: req, isLoading } = useSpareRequest(requestId);
  const [issued, setIssued] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const items = ((req?.items ?? []) as SpareItem[]).slice().sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    if (items.length) {
      setIssued((prev) =>
        Object.keys(prev).length ? prev : Object.fromEntries(items.map((i) => [i.id, String(i.qty_issued ?? 0)])),
      );
    }
    if (req?.remarks && !note) setNote(req.remarks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.id, items.length]);

  const saveIssue = useMutation({
    mutationFn: async () => {
      const updated = items.map((i) => ({ ...i, qty_issued: Number(issued[i.id] ?? i.qty_issued) || 0 }));
      for (const i of updated) {
        const { error } = await supabase
          .from("spare_request_items")
          .update({ qty_issued: i.qty_issued })
          .eq("id", i.id);
        if (error) throw error;
      }
      const next = derivedStatus(updated);
      const patch = {
        remarks: note.trim() || null,
        ...(next
          ? {
              status: next as string,
              issued_at: new Date().toISOString(),
              issued_by: (await supabase.auth.getUser()).data.user?.id ?? null,
            }
          : {}),
      };
      const { error } = await supabase.from("spare_requests").update(patch).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spare-request", requestId] });
      qc.invalidateQueries({ queryKey: ["spare-requests"] });
      toast.success("Issue details saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: SpareStatus) => {
      const patch = {
        status: status as string,
        ...(status === "APPROVED"
          ? { approved_by: (await supabase.auth.getUser()).data.user?.id ?? null }
          : {}),
      };
      const { error } = await supabase.from("spare_requests").update(patch).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spare-request", requestId] });
      qc.invalidateQueries({ queryKey: ["spare-requests"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!req) return <p className="text-sm text-muted-foreground">Requirement not found.</p>;

  const status = req.status as SpareStatus;
  const locked = status === "ISSUED" || status === "REJECTED";
  const preview = items.map((i) => ({ ...i, qty_issued: Number(issued[i.id] ?? i.qty_issued) || 0 }));

  return (
    <div>
      <PageHeader
        title={req.request_number}
        subtitle={`${SPARE_TYPE_LABEL[req.request_type] ?? req.request_type} · raised ${fmtDate(req.created_at)}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/spares">
                <ArrowLeft className="mr-1 h-4 w-4" /> All requirements
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2 print-area">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Parts</CardTitle>
            <Badge variant="secondary" className={spareStatusTone(status)}>
              {SPARE_STATUS_LABEL[status] ?? status}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Part no.</TableHead>
                  <TableHead className="w-20">Asked</TableHead>
                  <TableHead className="w-28">Issued</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-28">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm font-medium">
                      {i.part_name}
                      {i.remarks && <p className="text-xs text-muted-foreground">{i.remarks}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{i.part_number || "—"}</TableCell>
                    <TableCell className="text-sm">{Number(i.qty_requested)}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        inputMode="decimal"
                        disabled={locked || status === "PENDING"}
                        value={issued[i.id] ?? String(i.qty_issued)}
                        onChange={(e) => setIssued((p) => ({ ...p, [i.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="text-sm">{inr(Number(i.rate))}</TableCell>
                    <TableCell className="text-sm">{inr(Number(i.qty_issued) * Number(i.rate))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap justify-end gap-6 border-t border-border p-4 text-sm">
              <span className="text-muted-foreground">
                Requested value: <strong className="text-foreground">{inr(requestedValue(items))}</strong>
              </span>
              <span className="text-muted-foreground">
                Issued value: <strong className="text-foreground">{inr(issuedValue(preview))}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Requirement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Raised by" value={req.requester_name} />
              {req.job?.job_number && <Row label="Job card" value={req.job.job_number} />}
              <Row label="Mobile" value={req.mobile || "—"} />
              <Row label="Model" value={req.model || "—"} />
              <Row label="Chassis" value={req.chassis_number || "—"} />
              <Row label="Priority" value={req.priority} />
              <Row label="Needed by" value={fmtDate(req.needed_by)} />
              {req.issued_at && <Row label="Issued on" value={fmtDate(req.issued_at)} />}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Spare manager actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(SPARE_NEXT[status] ?? []).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === "REJECTED" ? "outline" : "default"}
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate(s)}
                  >
                    {SPARE_STATUS_LABEL[s]}
                  </Button>
                ))}
                {(SPARE_NEXT[status] ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">This requirement is closed.</p>
                )}
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea className="mt-1" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button className="w-full" disabled={locked || status === "PENDING" || saveIssue.isPending} onClick={() => saveIssue.mutate()}>
                {saveIssue.isPending ? "Saving…" : "Save issued quantities"}
              </Button>
              {status === "PENDING" && (
                <p className="text-xs text-muted-foreground">Approve the requirement before issuing parts.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
