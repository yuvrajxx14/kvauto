import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMe } from "@/lib/auth";
import { useStaffWithRoles } from "@/lib/queries";
import {
  IMPORT_SPECS, downloadCsv, parseCsv, runImport, templateCsv,
  type ImportKey, type ImportSpec, type RowResult,
} from "@/lib/bulk-import";

export const Route = createFileRoute("/_authenticated/import/")({
  head: () => ({
    meta: [
      { title: "Bulk data import · KrushiVidhya Automobiles" },
      { name: "description", content: "Upload existing customer, inquiry, stock, booking and delivery records into the dealership ERP using ready-made CSV formats." },
      { property: "og:title", content: "Bulk data import · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Management-only bulk upload of dealership records with downloadable CSV templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportPage,
});

const ORDER: ImportKey[] = ["customers", "inquiries", "stock", "bookings", "deliveries"];

function ImportPage() {
  const { data: me } = useMe();

  if (me && !me.isManagement) {
    return (
      <div>
        <PageHeader title="Bulk data import" description="Restricted area" />
        <Card className="shadow-card">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Bulk upload is available to CEO and manager accounts only. Please ask management to run the import.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Bulk data import"
        description="Download the format, fill it in Excel, save as CSV and upload. Records appear across the ERP immediately."
      />
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList className="flex-wrap">
          {ORDER.map((k) => (
            <TabsTrigger key={k} value={k}>{IMPORT_SPECS[k].title}</TabsTrigger>
          ))}
        </TabsList>
        {ORDER.map((k) => (
          <TabsContent key={k} value={k}>
            <ImportPanel spec={IMPORT_SPECS[k]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ImportPanel({ spec }: { spec: ImportSpec }) {
  const { data: me } = useMe();
  const { data: staff } = useStaffWithRoles();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const missing = rows.length
    ? spec.columns.filter((c) => c.required && !(c.key in (rows[0] ?? {}))).map((c) => c.key)
    : [];

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setRows(parsed);
    setResults(null);
    if (parsed.length === 0) toast.error("No data rows found in this file");
  }

  async function start() {
    if (!me) return;
    if (missing.length) { toast.error(`Missing columns: ${missing.join(", ")}`); return; }
    setProgress({ done: 0, total: rows.length });
    const res = await runImport(
      spec.key,
      rows,
      { userId: me.id, staff: (staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name })) },
      (done, total) => setProgress({ done, total }),
    );
    setProgress(null);
    setResults(res);
    qc.invalidateQueries();
    const ok = res.filter((r) => r.ok).length;
    if (ok === res.length) toast.success(`${ok} rows imported`);
    else toast.warning(`${ok} of ${res.length} rows imported — check the errors below`);
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{spec.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-2">
          <p className="text-sm text-muted-foreground">{spec.description}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(`krushividhya-${spec.key}-format.csv`, templateCsv(spec))}
            >
              <Download className="mr-2 h-4 w-4" /> Download format
            </Button>
            <Button size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Choose CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
            </Button>
            {fileName && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {fileName} · {rows.length} rows
              </span>
            )}
          </div>

          {missing.length > 0 && (
            <p className="text-sm text-destructive">Missing required columns: {missing.join(", ")}</p>
          )}

          {rows.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(rows[0] ?? {}).map((h) => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        {Object.keys(rows[0] ?? {}).map((h) => (
                          <TableCell key={h} className="whitespace-nowrap text-xs">{r[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 5 && <p className="text-xs text-muted-foreground">Showing first 5 of {rows.length} rows.</p>}
              <Button onClick={() => void start()} disabled={!!progress || missing.length > 0}>
                {progress ? `Importing ${progress.done}/${progress.total}…` : `Import ${rows.length} rows`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Result — {results.filter((r) => r.ok).length} imported, {results.filter((r) => !r.ok).length} failed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">CSV row</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell>{r.row}</TableCell>
                      <TableCell>
                        {r.ok ? (
                          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Column format</CardTitle></CardHeader>
        <CardContent className="p-6 pt-2">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Example / notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spec.columns.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-mono text-xs">{c.key}</TableCell>
                    <TableCell className="text-sm">{c.label}</TableCell>
                    <TableCell>{c.required ? <Badge variant="destructive">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.sample}{c.note ? ` — ${c.note}` : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
