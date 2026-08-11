import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useInquiries, useProfileMap } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { StatusBadge, InterestBadge } from "@/components/sales/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_STATUSES, STATUS_LABEL, fmtDate, todayISO, type InquiryStatus } from "@/lib/sales";

type Search = { status?: string };

export const Route = createFileRoute("/_authenticated/inquiries/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: typeof s['status'] === "string" ? s['status'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inquiries — KrushiVidhya Automobiles" },
      { name: "description", content: "All tractor sales inquiries with status, salesman and follow-up tracking." },
      { property: "og:title", content: "Inquiries — KrushiVidhya Automobiles" },
      { property: "og:description", content: "Tractor sales inquiry register." },
    ],
  }),
  component: InquiriesPage,
});

const PAGE_SIZE = 15;

function InquiriesPage() {
  const search = Route.useSearch();
  const [status, setStatus] = useState<string>(search.status ?? "all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sortDesc, setSortDesc] = useState(true);
  const { data, isLoading } = useInquiries({ status });
  const names = useProfileMap();
  const today = todayISO();

  const filtered = (data ?? [])
    .filter((i) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      const c = i.customer as { customer_name?: string; mobile?: string; village?: string } | null;
      return [i.inquiry_number, i.model, c?.customer_name, c?.mobile, c?.village]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    })
    .sort((a, b) =>
      sortDesc
        ? b.inquiry_date.localeCompare(a.inquiry_date)
        : a.inquiry_date.localeCompare(b.inquiry_date),
    );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Inquiries"
        subtitle={`${filtered.length} inquiries`}
        actions={
          <Button asChild>
            <Link to="/inquiries/new">
              <Plus className="mr-1 h-4 w-4" /> New Inquiry
            </Link>
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Search inquiry no, customer, mobile, village, model"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className="sm:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
              Date {sortDesc ? "↓" : "↑"}
            </Button>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <EmptyState title="No inquiries found" hint="Create a new inquiry to get started." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inquiry</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Village</TableHead>
                    <TableHead className="hidden lg:table-cell">Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Interest</TableHead>
                    <TableHead>Next follow-up</TableHead>
                    <TableHead className="hidden xl:table-cell">Salesman</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => {
                    const c = i.customer as {
                      customer_name?: string;
                      mobile?: string;
                      village?: string;
                    } | null;
                    const isOverdue =
                      i.next_followup_date && i.next_followup_date < today &&
                      !["BOOKED", "DELIVERED", "LOST"].includes(i.status);
                    return (
                      <TableRow key={i.id} className="cursor-pointer">
                        <TableCell className="font-mono text-xs">
                          <Link to="/inquiries/$inquiryId" params={{ inquiryId: i.id }} className="hover:underline">
                            {i.inquiry_number}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">{fmtDate(i.inquiry_date)}</div>
                        </TableCell>
                        <TableCell>
                          <Link to="/inquiries/$inquiryId" params={{ inquiryId: i.id }} className="font-medium hover:underline">
                            {c?.customer_name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{c?.mobile}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{c?.village || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{i.model}</TableCell>
                        <TableCell>
                          <StatusBadge status={i.status as InquiryStatus} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <InterestBadge level={i.interest_level} />
                        </TableCell>
                        <TableCell className={isOverdue ? "font-semibold text-destructive" : ""}>
                          {i.next_followup_date ? fmtDate(i.next_followup_date) : "— not set"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {names.get(i.salesman_id) ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {pages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
