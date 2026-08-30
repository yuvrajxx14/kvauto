import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ types */

export const DEPARTMENTS = [
  "SALES",
  "SERVICE",
  "SPARE_PARTS",
  "ACCOUNTS",
  "ADMIN",
  "FIELD",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABEL: Record<string, string> = {
  SALES: "Sales",
  SERVICE: "Service / Workshop",
  SPARE_PARTS: "Spare parts",
  ACCOUNTS: "Accounts",
  ADMIN: "Administration",
  FIELD: "Field / Others",
  GENERAL: "All departments",
};

export const EMPLOYMENT_STATUS = ["ACTIVE", "NOTICE", "EXITED"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUS)[number];

export const ATTENDANCE_STATUS = [
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "LEAVE",
  "PAID_LEAVE",
  "WEEKLY_OFF",
  "HOLIDAY",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const ATTENDANCE_LABEL: Record<string, string> = {
  PRESENT: "Present",
  HALF_DAY: "Half day",
  ABSENT: "Absent",
  LEAVE: "Leave (unpaid)",
  PAID_LEAVE: "Paid leave",
  WEEKLY_OFF: "Weekly off",
  HOLIDAY: "Holiday",
};

export type Employee = {
  id: string;
  user_id: string | null;
  employee_code: string;
  full_name: string;
  mobile: string | null;
  email: string | null;
  department: string;
  designation: string | null;
  date_of_joining: string;
  date_of_exit: string | null;
  employment_status: string;
  monthly_salary: number;
  village: string | null;
  tehsil: string | null;
  address: string | null;
  emergency_contact: string | null;
  bank_account: string | null;
  ifsc: string | null;
  onboarding_status: string;
  remarks: string | null;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  work_date: string;
  status: string;
  punch_in_at: string | null;
  punch_in_lat: number | null;
  punch_in_lng: number | null;
  punch_in_accuracy: number | null;
  punch_in_address: string | null;
  punch_out_at: string | null;
  punch_out_lat: number | null;
  punch_out_lng: number | null;
  punch_out_address: string | null;
  work_minutes: number;
  overtime_minutes: number;
  remarks: string | null;
  source: string;
};

export type Sop = {
  id: string;
  title: string;
  department: string;
  summary: string | null;
  content: string;
  version: number;
  pass_percent: number;
  is_mandatory: boolean;
  active: boolean;
};

export type SopQuestion = {
  id: string;
  sop_id: string;
  question: string;
  options: string[];
  correct_index: number;
  sort_order: number;
};

export type SopAck = {
  id: string;
  sop_id: string;
  employee_id: string;
  read_at: string | null;
  attempts: number;
  score_percent: number | null;
  passed: boolean;
  passed_at: string | null;
};

export type Payslip = {
  id: string;
  run_id: string;
  employee_id: string;
  month_start: string;
  base_salary: number;
  month_days: number;
  paid_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_hours: number;
  overtime_amount: number;
  allowances: number;
  deductions: number;
  advance: number;
  earned_salary: number;
  net_payable: number;
  remarks: string | null;
  employee?: Pick<Employee, "id" | "full_name" | "employee_code" | "department" | "designation"> | null;
};

/* ------------------------------------------------------------- date utils */

export function monthStart(d: Date | string = new Date()) {
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthEndExclusive(ms: string) {
  const [y, m] = ms.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  return `${nextY}-${String(nextM).padStart(2, "0")}-01`;
}

export function monthLabel(ms: string) {
  return new Date(ms + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function recentMonths(count = 12) {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) out.push(monthStart(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return out;
}

export function fmtMinutes(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function mapsLink(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/* ----------------------------------------------------------------- hooks */

export function useEmployees(includeExited = false) {
  return useQuery({
    queryKey: ["employees", includeExited],
    queryFn: async (): Promise<Employee[]> => {
      let q = supabase.from("employees").select("*").order("full_name");
      if (!includeExited) q = q.neq("employment_status", "EXITED");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Employee[];
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async (): Promise<Employee | null> => {
      const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as unknown as Employee) ?? null;
    },
  });
}

/** The employee record linked to the signed-in login (if any). */
export function useMyEmployee() {
  return useQuery({
    queryKey: ["my-employee"],
    queryFn: async (): Promise<Employee | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Employee) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useAttendance(params: { employeeId?: string; from: string; to: string }) {
  const { employeeId, from, to } = params;
  return useQuery({
    queryKey: ["attendance", employeeId ?? "all", from, to],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      let q = supabase
        .from("attendance_records")
        .select("*")
        .gte("work_date", from)
        .lt("work_date", to)
        .order("work_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceRecord[];
    },
  });
}

export function useTodayAttendance(employeeId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["attendance-today", employeeId ?? "none", today],
    enabled: !!employeeId,
    queryFn: async (): Promise<AttendanceRecord | null> => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId ?? "")
        .eq("work_date", today)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AttendanceRecord) ?? null;
    },
  });
}

export function useOnboardingMaster() {
  return useQuery({
    queryKey: ["onboarding-master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_checklist")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export function useEmployeeOnboarding(employeeId: string) {
  return useQuery({
    queryKey: ["employee-onboarding", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_onboarding")
        .select("*")
        .eq("employee_id", employeeId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSops(department?: string) {
  return useQuery({
    queryKey: ["sops", department ?? "all"],
    queryFn: async (): Promise<Sop[]> => {
      let q = supabase.from("sops").select("*").order("department").order("title");
      if (department && department !== "all") q = q.eq("department", department);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Sop[];
    },
  });
}

export function useSopQuestions(sopId?: string) {
  return useQuery({
    queryKey: ["sop-questions", sopId ?? "none"],
    enabled: !!sopId,
    queryFn: async (): Promise<SopQuestion[]> => {
      const { data, error } = await supabase
        .from("sop_questions")
        .select("*")
        .eq("sop_id", sopId ?? "")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((q) => ({
        ...(q as unknown as SopQuestion),
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
      }));
    },
  });
}

export function useSopAcks(employeeId?: string) {
  return useQuery({
    queryKey: ["sop-acks", employeeId ?? "none"],
    enabled: !!employeeId,
    queryFn: async (): Promise<SopAck[]> => {
      const { data, error } = await supabase
        .from("sop_acknowledgements")
        .select("*")
        .eq("employee_id", employeeId ?? "");
      if (error) throw error;
      return (data ?? []) as unknown as SopAck[];
    },
  });
}

export function usePayrollRun(month: string) {
  return useQuery({
    queryKey: ["payroll-run", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("month_start", month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePayslips(month: string) {
  return useQuery({
    queryKey: ["payslips", month],
    queryFn: async (): Promise<Payslip[]> => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*, employee:employees(id, full_name, employee_code, department, designation)")
        .eq("month_start", month)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Payslip[];
    },
  });
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: ["payslip", id],
    enabled: !!id,
    queryFn: async (): Promise<Payslip | null> => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*, employee:employees(id, full_name, employee_code, department, designation)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Payslip) ?? null;
    },
  });
}

/** Performance pulled straight from the ERP for a linked staff login. */
export type PerfMetrics = {
  inquiries: number;
  bookings: number;
  deliveries: number;
  serviceJobs: number;
  serviceClosed: number;
  presentDays: number;
  attendancePercent: number;
};

export function useEmployeePerformance(employee: Employee | null | undefined, month: string) {
  const to = monthEndExclusive(month);
  return useQuery({
    queryKey: ["employee-perf", employee?.id ?? "none", month],
    enabled: !!employee,
    queryFn: async (): Promise<PerfMetrics> => {
      const uid = employee?.user_id ?? null;
      const zeroIf = async (p: Promise<{ count: number | null }>) => (await p).count ?? 0;

      const [inquiries, bookings, deliveries, serviceJobs, serviceClosed] = await Promise.all([
        uid
          ? zeroIf(
              supabase
                .from("inquiries")
                .select("id", { count: "exact", head: true })
                .eq("salesman_id", uid)
                .gte("inquiry_date", month)
                .lt("inquiry_date", to),
            )
          : 0,
        uid
          ? zeroIf(
              supabase
                .from("bookings")
                .select("id", { count: "exact", head: true })
                .eq("salesman_id", uid)
                .gte("booking_date", month)
                .lt("booking_date", to),
            )
          : 0,
        uid
          ? zeroIf(
              supabase
                .from("deliveries")
                .select("id", { count: "exact", head: true })
                .eq("delivered_by", uid)
                .gte("delivery_date", month)
                .lt("delivery_date", to),
            )
          : 0,
        uid
          ? zeroIf(
              supabase
                .from("service_jobs")
                .select("id", { count: "exact", head: true })
                .eq("assigned_to", uid)
                .gte("received_date", month)
                .lt("received_date", to),
            )
          : 0,
        uid
          ? zeroIf(
              supabase
                .from("service_jobs")
                .select("id", { count: "exact", head: true })
                .eq("assigned_to", uid)
                .eq("status", "COMPLETED")
                .gte("received_date", month)
                .lt("received_date", to),
            )
          : 0,
      ]);

      const { data: att } = await supabase
        .from("attendance_records")
        .select("status")
        .eq("employee_id", employee?.id ?? "")
        .gte("work_date", month)
        .lt("work_date", to);

      const rows = att ?? [];
      const presentDays =
        rows.filter((r) => r.status === "PRESENT").length +
        rows.filter((r) => r.status === "HALF_DAY").length * 0.5;
      const days = new Date(monthEndExclusive(month)).getDate() === 1
        ? new Date(new Date(to).getTime() - 86400000).getDate()
        : 30;

      return {
        inquiries,
        bookings,
        deliveries,
        serviceJobs,
        serviceClosed,
        presentDays,
        attendancePercent: days ? Math.round((presentDays / days) * 100) : 0,
      };
    },
  });
}
