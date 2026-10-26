import * as XLSX from "xlsx";
import type { AttendanceRecord, Employee } from "@/lib/hr";

/** Short codes used inside the day-wise grid. */
const CODE: Record<string, string> = {
  PRESENT: "P",
  HALF_DAY: "H",
  ABSENT: "A",
  LEAVE: "L",
  PAID_LEAVE: "PL",
  WEEKLY_OFF: "W",
  HOLIDAY: "HO",
};

const LEGEND = "P Present · H Half day · A Absent · L Leave (unpaid) · PL Paid leave · W Weekly off · HO Holiday";

const code = (s: string) => CODE[s] ?? s.slice(0, 2);
const weight = (s: string) => (s === "PRESENT" ? 1 : s === "HALF_DAY" ? 0.5 : 0);
const hours = (min: number) => Math.round((min / 60) * 10) / 10;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function indexRecords(records: AttendanceRecord[]) {
  const byEmp = new Map<string, Map<string, AttendanceRecord>>();
  for (const r of records) {
    let m = byEmp.get(r.employee_id);
    if (!m) {
      m = new Map();
      byEmp.set(r.employee_id, m);
    }
    m.set(r.work_date, r);
  }
  return byEmp;
}

function setWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

export type AttendanceReportInput = {
  employees: Employee[];
  records: AttendanceRecord[];
  /** Full year of the selected month. */
  year: number;
  /** 0-11 month index of the selected month. */
  monthIndex: number;
};

/**
 * Builds the staff attendance workbook:
 *   Info, Daily (selected month), Weekly (selected month),
 *   Monthly (selected year) and Yearly (last 3 years).
 */
export function buildAttendanceWorkbook({ employees, records, year, monthIndex }: AttendanceReportInput) {
  const byEmp = indexRecords(records);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthKey = (m: number) => `${year}-${String(m + 1).padStart(2, "0")}`;

  const wb = XLSX.utils.book_new();

  // ---- Info ------------------------------------------------------------
  const info = XLSX.utils.aoa_to_sheet([
    ["KrushiVidhya Automobiles"],
    ["Attendance report"],
    [],
    ["Selected month", `${MONTHS[monthIndex]} ${year}`],
    ["Generated on", new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
    ["Employees in report", employees.length],
    [],
    ["Legend", LEGEND],
  ]);
  setWidths(info, [26, 100]);
  XLSX.utils.book_append_sheet(wb, info, "Info");

  const dayKey = (d: number) => `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // ---- Daily (selected month) -----------------------------------------
  const dailyHeader = ["Employee", "Code", "Department", ...Array.from({ length: daysInMonth }, (_, i) => i + 1), "P", "H", "A", "L", "W", "HO", "Hours"];
  const dailyRows: (string | number)[][] = [dailyHeader];
  for (const e of employees) {
    const m = byEmp.get(e.id);
    const counts: Record<string, number> = {};
    let mins = 0;
    const cells: (string | number)[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const r = m?.get(dayKey(d));
      if (r) {
        cells.push(code(r.status));
        counts[r.status] = (counts[r.status] ?? 0) + 1;
        mins += Number(r.work_minutes ?? 0);
      } else cells.push("");
    }
    dailyRows.push([
      e.full_name,
      e.employee_code,
      e.department,
      ...cells,
      counts.PRESENT ?? 0,
      counts.HALF_DAY ?? 0,
      counts.ABSENT ?? 0,
      (counts.LEAVE ?? 0) + (counts.PAID_LEAVE ?? 0),
      counts.WEEKLY_OFF ?? 0,
      counts.HOLIDAY ?? 0,
      hours(mins),
    ]);
  }
  const daily = XLSX.utils.aoa_to_sheet(dailyRows);
  setWidths(daily, [24, 10, 14, ...Array.from({ length: daysInMonth }, () => 4), 5, 5, 5, 5, 5, 5, 8]);
  XLSX.utils.book_append_sheet(wb, daily, `Daily ${MONTHS[monthIndex]}`);

  // ---- Weekly (selected month) ----------------------------------------
  const weekRanges = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 28],
    [29, daysInMonth],
  ].filter(([, end]) => end <= daysInMonth) as [number, number][];
  const weeklyHeader = ["Employee", "Code", ...weekRanges.map(([, e], i) => `Week ${i + 1} (${e === daysInMonth ? `${weekRanges[weekRanges.length - 1][0]}-${e}` : `${[1, 8, 15, 22, 29][i]}-${e}`})`), "Total days", "Total hours"];
  const weeklyRows: (string | number)[][] = [weeklyHeader];
  for (const e of employees) {
    const m = byEmp.get(e.id);
    const cells = weekRanges.map(([start, end]) => {
      let w = 0;
      let mins = 0;
      for (let d = start; d <= end; d++) {
        const r = m?.get(dayKey(d));
        if (r) {
          w += weight(r.status);
          mins += Number(r.work_minutes ?? 0);
        }
      }
      return w === 0 && mins === 0 ? 0 : `${Math.round(w * 10) / 10} (${hours(mins)}h)`;
    });
    let total = 0;
    let mins = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const r = m?.get(dayKey(d));
      if (r) {
        total += weight(r.status);
        mins += Number(r.work_minutes ?? 0);
      }
    }
    weeklyRows.push([e.full_name, e.employee_code, ...cells, Math.round(total * 10) / 10, hours(mins)]);
  }
  const weekly = XLSX.utils.aoa_to_sheet(weeklyRows);
  setWidths(weekly, [24, 10, ...weekRanges.map(() => 14), 10, 10]);
  XLSX.utils.book_append_sheet(wb, weekly, `Weekly ${MONTHS[monthIndex]}`);

  // ---- Monthly (selected year) ----------------------------------------
  const monthlyHeader = ["Employee", "Code", "Department", ...MONTHS, "Total days", "Total hours"];
  const monthlyRows: (string | number)[][] = [monthlyHeader];
  for (const e of employees) {
    const m = byEmp.get(e.id);
    const cells = MONTHS.map((_, mi) => {
      let w = 0;
      let mins = 0;
      for (const [, r] of m ?? []) {
        if (r.work_date.startsWith(monthKey(mi))) {
          w += weight(r.status);
          mins += Number(r.work_minutes ?? 0);
        }
      }
      return w === 0 && mins === 0 ? 0 : Math.round(w * 10) / 10;
    });
    const tot = cells.reduce<number>((a, c) => a + (typeof c === "number" ? c : 0), 0);
    let mins = 0;
    for (const [, r] of m ?? []) if (r.work_date.startsWith(`${year}-`)) mins += Number(r.work_minutes ?? 0);
    monthlyRows.push([e.full_name, e.employee_code, e.department, ...cells, Math.round(tot * 10) / 10, hours(mins)]);
  }
  const monthly = XLSX.utils.aoa_to_sheet(monthlyRows);
  setWidths(monthly, [24, 10, 14, ...MONTHS.map(() => 6), 10, 10]);
  XLSX.utils.book_append_sheet(wb, monthly, `Monthly ${year}`);

  // ---- Yearly (last 3 years) ------------------------------------------
  const years = [year - 2, year - 1, year];
  const yearlyHeader = ["Employee", "Code", "Department", ...years, "Total days", "Total hours"];
  const yearlyRows: (string | number)[][] = [yearlyHeader];
  for (const e of employees) {
    const m = byEmp.get(e.id);
    const cells = years.map((y) => {
      let w = 0;
      let mins = 0;
      for (const [, r] of m ?? []) {
        if (r.work_date.startsWith(`${y}-`)) {
          w += weight(r.status);
          mins += Number(r.work_minutes ?? 0);
        }
      }
      return w === 0 && mins === 0 ? 0 : Math.round(w * 10) / 10;
    });
    const tot = cells.reduce<number>((a, c) => a + (typeof c === "number" ? c : 0), 0);
    let mins = 0;
    for (const [, r] of m ?? []) mins += Number(r.work_minutes ?? 0);
    yearlyRows.push([e.full_name, e.employee_code, e.department, ...cells, Math.round(tot * 10) / 10, hours(mins)]);
  }
  const yearly = XLSX.utils.aoa_to_sheet(yearlyRows);
  setWidths(yearly, [24, 10, 14, ...years.map(() => 8), 10, 10]);
  XLSX.utils.book_append_sheet(wb, yearly, "Yearly");

  return wb;
}

export function attendanceReportFilename(year: number, monthIndex: number) {
  return `attendance-report-${year}-${String(monthIndex + 1).padStart(2, "0")}.xlsx`;
}
