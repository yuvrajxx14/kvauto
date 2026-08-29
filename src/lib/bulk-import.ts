import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ CSV I/O */

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }

  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (clean.length === 0) return [];
  const header = clean[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return clean.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? "").trim(); });
    return o;
  });
}

export function toCsv(rows: string[][]) {
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------- definitions */

export type ImportKey = "customers" | "inquiries" | "stock" | "bookings" | "deliveries";

export type ColumnSpec = { key: string; label: string; required?: boolean; sample: string; note?: string };

export type ImportSpec = {
  key: ImportKey;
  title: string;
  description: string;
  columns: ColumnSpec[];
};

const CUSTOMER_COLS: ColumnSpec[] = [
  { key: "customer_name", label: "Customer name", required: true, sample: "Rameshbhai Patel" },
  { key: "mobile", label: "Mobile", required: true, sample: "9876543210", note: "10 digits — used to match existing customers" },
  { key: "village", label: "Village", required: true, sample: "Atkot" },
  { key: "taluka", label: "Taluka", sample: "JASDAN" },
  { key: "customer_type", label: "Customer type", sample: "Farmer", note: "Farmer / Contractor / Commercial / Other" },
  { key: "address", label: "Address", sample: "Near Bus Stand" },
];

export const IMPORT_SPECS: Record<ImportKey, ImportSpec> = {
  customers: {
    key: "customers",
    title: "Customers",
    description: "Create or update customer master records. Existing customers are matched on mobile number.",
    columns: CUSTOMER_COLS,
  },
  inquiries: {
    key: "inquiries",
    title: "Inquiries",
    description: "Import open inquiries. The customer is created automatically when the mobile number is new.",
    columns: [
      ...CUSTOMER_COLS,
      { key: "inquiry_date", label: "Inquiry date", sample: "2026-08-01", note: "YYYY-MM-DD, defaults to today" },
      { key: "model", label: "Tractor model", required: true, sample: "575 DI XP PLUS" },
      { key: "hp", label: "HP", sample: "47 HP" },
      { key: "variant", label: "Variant", sample: "4WD" },
      { key: "source", label: "Source", sample: "Walk-in" },
      { key: "interest_level", label: "Interest level", sample: "WARM", note: "HOT / WARM / COLD" },
      { key: "next_followup_date", label: "Next follow-up date", sample: "2026-09-05" },
      { key: "salesman_name", label: "Salesman name", sample: "Jaydeep Vala", note: "Must match a staff name, else you are used" },
      { key: "remarks", label: "Remarks", sample: "Wants subsidy" },
    ],
  },
  stock: {
    key: "stock",
    title: "Tractor stock",
    description: "Import tractor units currently lying in stock.",
    columns: [
      { key: "chassis_number", label: "Chassis number", required: true, sample: "MBNAAAA1234567" },
      { key: "engine_number", label: "Engine number", required: true, sample: "ENG998877" },
      { key: "model", label: "Model", required: true, sample: "575 DI XP PLUS" },
      { key: "variant", label: "Variant", sample: "4WD" },
      { key: "colour", label: "Colour", sample: "Red" },
      { key: "mfg_year", label: "Mfg year", sample: "2026" },
      { key: "arrival_date", label: "Arrival date", sample: "2026-07-20" },
      { key: "location", label: "Location", sample: "Main Showroom" },
      { key: "received_from", label: "Received from", sample: "Mahindra Company" },
      { key: "status", label: "Status", sample: "AVAILABLE", note: "AVAILABLE / INSPECTION_PENDING" },
    ],
  },
  bookings: {
    key: "bookings",
    title: "Bookings",
    description: "Import confirmed bookings. Customer and a linked inquiry are created automatically when missing.",
    columns: [
      ...CUSTOMER_COLS,
      { key: "model", label: "Tractor model", required: true, sample: "575 DI XP PLUS" },
      { key: "variant", label: "Variant", sample: "4WD" },
      { key: "booking_date", label: "Booking date", sample: "2026-07-10" },
      { key: "final_price", label: "Final deal price", required: true, sample: "785000" },
      { key: "booking_amount", label: "Booking amount received", required: true, sample: "25000" },
      { key: "amount_received", label: "Total amount received till date", sample: "425000", note: "Extra over booking amount is posted as a payment" },
      { key: "finance_type", label: "Finance type", sample: "CASH", note: "CASH or LOAN" },
      { key: "loan_amount", label: "Loan amount", sample: "0" },
      { key: "payment_mode", label: "Payment mode", sample: "Cash", note: "Cash / Bank / UPI / Cheque" },
      { key: "salesman_name", label: "Salesman name", sample: "Jaydeep Vala" },
      { key: "remarks", label: "Remarks", sample: "Migrated from old register" },
    ],
  },
  deliveries: {
    key: "deliveries",
    title: "Delivered tractors",
    description:
      "Import already delivered tractors end-to-end: customer → inquiry → booking → payments → chassis allocation → delivery.",
    columns: [
      ...CUSTOMER_COLS,
      { key: "model", label: "Tractor model", required: true, sample: "575 DI XP PLUS" },
      { key: "variant", label: "Variant", sample: "4WD" },
      { key: "chassis_number", label: "Chassis number", required: true, sample: "MBNAAAA1234567" },
      { key: "engine_number", label: "Engine number", required: true, sample: "ENG998877" },
      { key: "booking_date", label: "Booking date", sample: "2026-06-02" },
      { key: "delivery_date", label: "Delivery date", required: true, sample: "2026-06-20" },
      { key: "final_price", label: "Final deal price", required: true, sample: "785000" },
      { key: "finance_type", label: "Finance type", sample: "CASH", note: "CASH or LOAN" },
      { key: "loan_amount", label: "Loan amount", sample: "0" },
      { key: "payment_mode", label: "Payment mode", sample: "Cash" },
      { key: "use_type", label: "Use type", sample: "AGRICULTURE", note: "AGRICULTURE or COMMERCIAL" },
      { key: "salesman_name", label: "Salesman name", sample: "Jaydeep Vala" },
      { key: "remarks", label: "Remarks", sample: "Historical delivery" },
    ],
  },
};

export function templateCsv(spec: ImportSpec) {
  return toCsv([spec.columns.map((c) => c.key), spec.columns.map((c) => c.sample)]);
}

/* ----------------------------------------------------------------- importer */

export type RowResult = { row: number; ok: boolean; message: string };

type Ctx = { userId: string; staff: { id: string; full_name: string }[] };

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const today = () => new Date().toISOString().slice(0, 10);
const date = (v: string | undefined) => {
  const s = (v ?? "").trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, "0")}-${iso[3]!.padStart(2, "0")}`;
  return null;
};
const mobile10 = (v: string | undefined) => String(v ?? "").replace(/\D/g, "").slice(-10);

function salesmanId(r: Record<string, string>, ctx: Ctx) {
  const name = (r["salesman_name"] ?? "").trim().toLowerCase();
  if (!name) return ctx.userId;
  const hit = ctx.staff.find((s) => s.full_name.toLowerCase() === name);
  return hit?.id ?? ctx.userId;
}

async function upsertCustomer(r: Record<string, string>, ctx: Ctx) {
  const mobile = mobile10(r["mobile"]);
  if (!mobile || mobile.length < 10) throw new Error("Valid 10-digit mobile is required");
  const name = (r["customer_name"] ?? "").trim();
  if (!name) throw new Error("Customer name is required");
  const village = (r["village"] ?? "").trim();
  if (!village) throw new Error("Village is required");

  const { data: existing } = await supabase.from("customers").select("id").eq("mobile", mobile).maybeSingle();
  if (existing) return existing.id;

  const type = (r["customer_type"] ?? "Farmer").trim();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      customer_name: name,
      mobile,
      village,
      taluka: (r["taluka"] ?? "").trim() || null,
      address: (r["address"] ?? "").trim() || null,
      customer_type: (["Farmer", "Contractor", "Commercial", "Other"].includes(type) ? type : "Farmer") as never,
      assigned_salesman_id: salesmanId(r, ctx),
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createInquiry(r: Record<string, string>, ctx: Ctx, customerId: string, inqDate: string) {
  const model = (r["model"] ?? "").trim();
  if (!model) throw new Error("Tractor model is required");
  const interest = (r["interest_level"] ?? "WARM").toUpperCase();
  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      inquiry_number: "",
      customer_id: customerId,
      salesman_id: salesmanId(r, ctx),
      inquiry_date: inqDate,
      source: (r["source"] ?? "").trim() || "Other",
      model,
      hp: (r["hp"] ?? "").trim() || null,
      variant: (r["variant"] ?? "").trim() || null,
      interest_level: (["HOT", "WARM", "COLD"].includes(interest) ? interest : "WARM") as never,
      next_followup_date: date(r["next_followup_date"]),
      remarks: (r["remarks"] ?? "").trim() || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createBooking(r: Record<string, string>, ctx: Ctx, opts: { requireStockReady?: boolean }) {
  const customerId = await upsertCustomer(r, ctx);
  const bookingDate = date(r["booking_date"]) ?? today();
  const inquiryId = await createInquiry(r, ctx, customerId, bookingDate);

  const finalPrice = num(r["final_price"]);
  if (finalPrice <= 0) throw new Error("Final price must be greater than 0");
  let bookingAmount = num(r["booking_amount"]);
  if (opts.requireStockReady && bookingAmount <= 0) bookingAmount = finalPrice;
  if (bookingAmount <= 0) throw new Error("Booking amount must be greater than 0");
  if (bookingAmount > finalPrice) bookingAmount = finalPrice;

  const financeType = (r["finance_type"] ?? "CASH").toUpperCase() === "LOAN" ? "LOAN" : "CASH";
  const mode = (r["payment_mode"] ?? "Cash").trim() || "Cash";

  const { data: bookingId, error } = await supabase.rpc("create_booking_atomic", {
    _inquiry_id: inquiryId,
    _final_price: finalPrice,
    _booking_amount: bookingAmount,
    _booking_date: bookingDate,
    _salesman_id: salesmanId(r, ctx),
    _remarks: (r["remarks"] ?? "").trim(),
    _tractor_model: (r["model"] ?? "").trim(),
    _variant: (r["variant"] ?? "").trim(),
    _payment_mode: mode,
    _finance_type: financeType,
    _loan_amount: num(r["loan_amount"]),
  });
  if (error) throw error;
  return { bookingId: bookingId as unknown as string, bookingDate, mode };
}

async function payRemaining(bookingId: string, payDate: string, mode: string, target: number | null) {
  const { data: b, error } = await supabase
    .from("bookings")
    .select("final_price, extra_charges, amount_received")
    .eq("id", bookingId)
    .single();
  if (error) throw error;
  const due = Number(b.final_price) + Number(b.extra_charges ?? 0);
  const want = target === null ? due : Math.min(target, due);
  const delta = want - Number(b.amount_received ?? 0);
  if (delta < 1) return;
  const { error: pErr } = await supabase.rpc("receive_booking_payment_atomic", {
    _booking_id: bookingId,
    _amount: Math.round(delta * 100) / 100,
    _payment_date: payDate,
    _payment_mode: mode,
    _reference_number: "",
    _remarks: "Imported payment",
    _payment_type: "PAYMENT",
  });
  if (pErr) throw pErr;
}

async function ensureStockUnit(r: Record<string, string>) {
  const chassis = (r["chassis_number"] ?? "").trim().toUpperCase();
  const engine = (r["engine_number"] ?? "").trim().toUpperCase();
  if (!chassis || !engine) throw new Error("Chassis and engine numbers are required");

  const { data: existing } = await supabase.from("tractor_stock").select("id, status").eq("chassis_number", chassis).maybeSingle();
  if (existing) {
    if (existing.status !== "AVAILABLE") {
      await supabase.from("tractor_stock").update({ status: "AVAILABLE" }).eq("id", existing.id);
    }
    return existing.id;
  }
  const { data, error } = await supabase
    .from("tractor_stock")
    .insert({
      chassis_number: chassis,
      engine_number: engine,
      model: (r["model"] ?? "").trim(),
      variant: (r["variant"] ?? "").trim() || null,
      colour: (r["colour"] ?? "").trim() || null,
      mfg_year: (r["mfg_year"] ?? "").trim() || null,
      arrival_date: date(r["arrival_date"]),
      location: (r["location"] ?? "").trim() || "Main Showroom",
      received_from: (r["received_from"] ?? "").trim() || null,
      status: "AVAILABLE",
      inspection_status: "PASSED",
      pdi_status: "PASSED",
      delivery_check_status: "PASSED",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function importRow(kind: ImportKey, r: Record<string, string>, ctx: Ctx): Promise<string> {
  if (kind === "customers") {
    await upsertCustomer(r, ctx);
    return "Customer ready";
  }
  if (kind === "inquiries") {
    const customerId = await upsertCustomer(r, ctx);
    await createInquiry(r, ctx, customerId, date(r["inquiry_date"]) ?? today());
    return "Inquiry created";
  }
  if (kind === "stock") {
    const chassis = (r["chassis_number"] ?? "").trim().toUpperCase();
    const { data: dup } = await supabase.from("tractor_stock").select("id").eq("chassis_number", chassis).maybeSingle();
    if (dup) return "Skipped — chassis already in stock";
    const status = "AVAILABLE";
    const { error } = await supabase.from("tractor_stock").insert({
      chassis_number: chassis,
      engine_number: (r["engine_number"] ?? "").trim().toUpperCase(),
      model: (r["model"] ?? "").trim(),
      variant: (r["variant"] ?? "").trim() || null,
      colour: (r["colour"] ?? "").trim() || null,
      mfg_year: (r["mfg_year"] ?? "").trim() || null,
      arrival_date: date(r["arrival_date"]),
      location: (r["location"] ?? "").trim() || "Main Showroom",
      received_from: (r["received_from"] ?? "").trim() || null,
      status,
    });
    if (error) throw error;
    return "Stock unit added";
  }
  if (kind === "bookings") {
    const { bookingId, bookingDate, mode } = await createBooking(r, ctx, {});
    const received = (r["amount_received"] ?? "").trim();
    if (received) await payRemaining(bookingId, bookingDate, mode, num(received));
    return "Booking created";
  }

  // deliveries — full chain
  const deliveryDate = date(r["delivery_date"]);
  if (!deliveryDate) throw new Error("Delivery date is required (YYYY-MM-DD)");
  const chassis = (r["chassis_number"] ?? "").trim().toUpperCase();
  const { data: dupAlloc } = await supabase
    .from("tractor_allocations")
    .select("id")
    .eq("chassis_number", chassis)
    .maybeSingle();
  if (dupAlloc) return "Skipped — chassis already delivered/allocated";

  const stockId = await ensureStockUnit(r);
  const { bookingId, mode } = await createBooking(r, ctx, { requireStockReady: true });
  await payRemaining(bookingId, deliveryDate, mode, null);

  const { error: aErr } = await supabase.rpc("allocate_tractor_atomic", {
    _booking_id: bookingId,
    _tractor_stock_id: stockId,
  });
  if (aErr) throw aErr;

  const useType = (r["use_type"] ?? "AGRICULTURE").toUpperCase() === "COMMERCIAL" ? "COMMERCIAL" : "AGRICULTURE";
  const { error: dErr } = await supabase.rpc("complete_delivery_atomic", {
    _booking_id: bookingId,
    _delivery_date: deliveryDate,
    _remarks: (r["remarks"] ?? "").trim() || "Imported delivery",
    _use_type: useType,
  } as never);
  if (dErr) throw dErr;
  return "Delivery recorded";
}

export async function runImport(
  kind: ImportKey,
  rows: Record<string, string>[],
  ctx: Ctx,
  onProgress?: (done: number, total: number) => void,
): Promise<RowResult[]> {
  const out: RowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const message = await importRow(kind, rows[i]!, ctx);
      out.push({ row: i + 2, ok: true, message });
    } catch (e) {
      out.push({ row: i + 2, ok: false, message: e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(i + 1, rows.length);
  }
  return out;
}
