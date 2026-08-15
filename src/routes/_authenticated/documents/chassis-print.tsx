import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Printer, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/sales/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChassisSheet, type ChassisSheetData } from "@/components/sales/chassis-sheet";
import {
  DEFAULT_APPEARANCE,
  DISTRESS_OPTIONS,
  TEXTURE_OPTIONS,
  chassisError,
  normalizeChassis,
  one,
  useChassisReference,
  useChassisReferences,
  useVehicleForChassisPrint,
  useVehicleSearch,
  type ChassisAppearance,
} from "@/lib/chassis";
import { useMe } from "@/lib/auth";
import { fmtDate } from "@/lib/sales";

type Search = { stockId?: string | undefined; refId?: string | undefined };

export const Route = createFileRoute("/_authenticated/documents/chassis-print")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    stockId: typeof s['stockId'] === "string" ? s['stockId'] : undefined,
    refId: typeof s['refId'] === "string" ? s['refId'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Chassis Print Generator · KrushiVidhya Automobiles" },
      {
        name: "description",
        content: "Generate an A4 digital reference sheet for a tractor chassis number from dealership records.",
      },
      { property: "og:title", content: "Chassis Print Generator · KrushiVidhya Automobiles" },
      { property: "og:description", content: "A4 digital chassis number reference sheets for internal documentation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChassisPrintPage,
});

function ChassisPrintPage() {
  const { stockId, refId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();

  const [term, setTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(stockId);
  const [chassis, setChassis] = useState("");
  const [appearance, setAppearance] = useState<ChassisAppearance>(DEFAULT_APPEARANCE);
  const [manual, setManual] = useState({ model: "", engine: "", customer: "", bookingNumber: "" });
  const [nonce, setNonce] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the A4 sheet (794px at 96dpi) into the preview column.
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 32;
      setScale(Math.min(1, Math.max(0.3, w / 794)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data: vehicles, isLoading: searching } = useVehicleSearch(term);
  const { data: vehicle } = useVehicleForChassisPrint(selectedId);
  const { data: savedRef } = useChassisReference(refId);

  // Populate from the selected vehicle record (never mutates the stock master).
  useEffect(() => {
    if (!vehicle) return;
    const alloc = one(vehicle.allocation as never) as
      | { booking?: { booking_number?: string; customer?: { customer_name?: string } } }
      | undefined;
    const booking = one(alloc?.booking as never) as
      | { booking_number?: string; customer?: { customer_name?: string } | { customer_name?: string }[] }
      | undefined;
    const customer = one(booking?.customer as never) as { customer_name?: string } | undefined;
    setChassis(normalizeChassis(vehicle.chassis_number ?? ""));
    setManual({
      model: [vehicle.model, vehicle.variant].filter(Boolean).join(" "),
      engine: vehicle.engine_number ?? "",
      customer: customer?.customer_name ?? "",
      bookingNumber: booking?.booking_number ?? "",
    });
  }, [vehicle]);

  // Re-open a saved reference.
  useEffect(() => {
    if (!savedRef) return;
    setChassis(normalizeChassis(savedRef.chassis_number ?? ""));
    setManual({
      model: [savedRef.model, savedRef.variant].filter(Boolean).join(" "),
      engine: savedRef.engine_number ?? "",
      customer: (one(savedRef.customer as never) as { customer_name?: string } | undefined)?.customer_name ?? "",
      bookingNumber: (one(savedRef.booking as never) as { booking_number?: string } | undefined)?.booking_number ?? "",
    });
    const s = savedRef.appearance_settings as Partial<ChassisAppearance> | null;
    setAppearance({ ...DEFAULT_APPEARANCE, ...(s ?? {}) });
    if (savedRef.tractor_stock_id) setSelectedId(savedRef.tractor_stock_id);
  }, [savedRef]);

  const err = chassisError(chassis);

  const sheetData: ChassisSheetData = useMemo(
    () => ({
      chassis,
      model: manual.model,
      engine: manual.engine,
      customer: manual.customer,
      bookingNumber: manual.bookingNumber,
      generatedBy: me?.profile?.full_name ?? null,
      generatedAt: new Date(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chassis, manual, me?.profile?.full_name, nonce],
  );

  const save = useMutation({
    mutationFn: async () => {
      const alloc = one(vehicle?.allocation as never) as { booking_id?: string; booking?: unknown } | undefined;
      const booking = one(alloc?.booking as never) as { id?: string; customer_id?: string } | undefined;
      const delivery = one(vehicle?.delivery as never) as { id?: string } | undefined;
      const { error } = await supabase.from("chassis_print_references").insert({
        tractor_stock_id: selectedId ?? null,
        chassis_number: chassis,
        engine_number: manual.engine || null,
        model: manual.model || null,
        customer_id: booking?.customer_id ?? null,
        booking_id: booking?.id ?? alloc?.booking_id ?? null,
        delivery_id: delivery?.id ?? null,
        appearance_settings: appearance as unknown as Record<string, unknown>,
        generated_by: me?.profile?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chassis reference saved");
      qc.invalidateQueries({ queryKey: ["chassis-references"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadPdf() {
    if (!sheetRef.current) return;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(sheetRef.current, { scale: 3, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`chassis-reference-${chassis || "sheet"}.pdf`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Chassis Print Generator"
        subtitle="Generate an A4 digital reference sheet for a vehicle chassis number."
      />

      <Tabs defaultValue="generate">
        <TabsList data-print-hide>
          <TabsTrigger value="generate">Generator</TabsTrigger>
          <TabsTrigger value="history">Chassis print history</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-4" data-print-hide>
              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Vehicle / Tractor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Search chassis, engine or model"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-56 space-y-1 overflow-auto rounded-md border p-1">
                    {searching && <p className="p-2 text-xs text-muted-foreground">Searching…</p>}
                    {(vehicles ?? []).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(v.id);
                          void navigate({ search: { stockId: v.id }, replace: true });
                        }}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${
                          selectedId === v.id ? "bg-accent" : ""
                        }`}
                      >
                        <span className="font-medium">{v.chassis_number}</span>
                        <span className="block text-xs text-muted-foreground">
                          {v.model} {v.variant ?? ""} · Engine {v.engine_number}
                        </span>
                      </button>
                    ))}
                    {!searching && (vehicles ?? []).length === 0 && (
                      <p className="p-2 text-xs text-muted-foreground">No matching vehicles.</p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Model</Label>
                      <Input value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Engine number</Label>
                      <Input value={manual.engine} onChange={(e) => setManual({ ...manual, engine: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Customer</Label>
                      <Input value={manual.customer} onChange={(e) => setManual({ ...manual, customer: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Booking / Delivery no.</Label>
                      <Input
                        value={manual.bookingNumber}
                        onChange={(e) => setManual({ ...manual, bookingNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Chassis number</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    className="h-12 font-mono text-lg tracking-widest"
                    placeholder="MBNABC123456789"
                    value={chassis}
                    onChange={(e) => setChassis(normalizeChassis(e.target.value))}
                  />
                  <div className="flex justify-between text-xs">
                    <span className={err ? "text-destructive" : "text-muted-foreground"}>
                      {err ?? "Reference only — the vehicle master is not changed."}
                    </span>
                    <span className="text-muted-foreground">{chassis.length} chars</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <Accordion type="single" collapsible defaultValue="appearance">
                    <AccordionItem value="appearance" className="border-none">
                      <AccordionTrigger className="py-1 text-sm font-semibold">Print appearance settings</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-3">
                        <SliderRow
                          label="Character size"
                          hint={["Small", "Medium", "Large"][appearance.size - 1] ?? ""}
                          value={appearance.size}
                          min={1}
                          max={3}
                          onChange={(v) => setAppearance({ ...appearance, size: v })}
                        />
                        <SliderRow
                          label="Character spacing"
                          hint={["Compact", "Normal", "Wide"][appearance.spacing - 1] ?? ""}
                          value={appearance.spacing}
                          min={1}
                          max={3}
                          onChange={(v) => setAppearance({ ...appearance, spacing: v })}
                        />
                        <SliderRow
                          label="Horizontal stretch"
                          hint={`${appearance.stretch}%`}
                          value={appearance.stretch}
                          min={90}
                          max={150}
                          onChange={(v) => setAppearance({ ...appearance, stretch: v })}
                        />
                        <OptionRow
                          label="Texture"
                          options={TEXTURE_OPTIONS as unknown as string[]}
                          value={appearance.texture}
                          onChange={(v) => setAppearance({ ...appearance, texture: v as ChassisAppearance["texture"] })}
                        />
                        <OptionRow
                          label="Distress"
                          options={DISTRESS_OPTIONS as unknown as string[]}
                          value={appearance.distress}
                          onChange={(v) => setAppearance({ ...appearance, distress: v as ChassisAppearance["distress"] })}
                        />
                        <SliderRow
                          label="Pressure variation"
                          hint={["Low", "Medium", "High"][appearance.pressure - 1] ?? ""}
                          value={appearance.pressure}
                          min={1}
                          max={3}
                          onChange={(v) => setAppearance({ ...appearance, pressure: v })}
                        />
                        <SliderRow
                          label="Rotation / imperfection"
                          hint={`${appearance.rotation}°`}
                          value={appearance.rotation}
                          min={0}
                          max={3}
                          onChange={(v) => setAppearance({ ...appearance, rotation: v })}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
                  <RefreshCw className="mr-1 h-4 w-4" /> Generate preview
                </Button>
                <Button size="sm" disabled={!!err} onClick={() => window.print()}>
                  <Printer className="mr-1 h-4 w-4" /> Print A4
                </Button>
                <Button variant="outline" size="sm" disabled={!!err} onClick={downloadPdf}>
                  <Download className="mr-1 h-4 w-4" /> Download PDF
                </Button>
                <Button variant="outline" size="sm" disabled={!!err || save.isPending} onClick={() => save.mutate()}>
                  <Save className="mr-1 h-4 w-4" /> Save reference
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Output is always marked “Digital reference — not original chassis impression”. For legal or RTO purposes,
                take the physical impression from the vehicle.
              </p>
            </div>

            <div
              ref={previewBoxRef}
              className="overflow-hidden rounded-lg border bg-muted/30 p-4 print:border-0 print:bg-transparent print:p-0"
            >
              <div
                className="mx-auto"
                style={{ width: `${794 * scale}px`, height: `${1123 * scale}px` }}
              >
                <div
                  ref={sheetRef}
                  className="origin-top-left shadow-sm print:shadow-none"
                  style={{ transform: `scale(${scale})` }}
                >
                  <ChassisSheet data={sheetData} appearance={appearance} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab onOpen={(id) => void navigate({ search: { refId: id }, replace: false })} canDelete={!!me?.isManagement} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0] ?? value)} />
    </div>
  );
}

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Button key={o} type="button" size="sm" variant={value === o ? "default" : "outline"} onClick={() => onChange(o)}>
            {o.charAt(0) + o.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ onOpen, canDelete }: { onOpen: (id: string) => void; canDelete: boolean }) {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data: rows, isLoading } = useChassisReferences({ search });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chassis_print_references").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reference deleted");
      qc.invalidateQueries({ queryKey: ["chassis-references"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Chassis print history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Search chassis, engine or model"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Chassis</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Generated by</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {(rows ?? []).map((r) => {
                const customer = one(r.customer as never) as { customer_name?: string } | undefined;
                const booking = one(r.booking as never) as { booking_number?: string } | undefined;
                const gen = one(r.generator as never) as { full_name?: string } | undefined;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.generated_at)}</TableCell>
                    <TableCell className="font-mono">{r.chassis_number}</TableCell>
                    <TableCell>{r.model ?? "—"}</TableCell>
                    <TableCell>{customer?.customer_name ?? "—"}</TableCell>
                    <TableCell>{booking?.booking_number ?? "—"}</TableCell>
                    <TableCell>{gen?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onOpen(r.id)}>
                        View / print
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 text-destructive"
                          onClick={() => del.mutate(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && (rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">No references generated yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
