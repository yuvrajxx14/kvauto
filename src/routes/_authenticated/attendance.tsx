import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Download, LogIn, LogOut, MapPin, Navigation } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/sales/ui";
import { FilterSelect } from "@/components/sales/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ATTENDANCE_LABEL,
  fmtMinutes,
  fmtTime,
  mapsLink,
  monthEndExclusive,
  monthLabel,
  monthStart,
  recentMonths,
  useAttendance,
  useEmployees,
  useMyEmployee,
  useTodayAttendance,
  type AttendanceRecord,
} from "@/lib/hr";
import { buildAttendanceWorkbook, attendanceReportFilename } from "@/lib/attendance-report";
import { usePerms } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Mark attendance · KrushiVidhya Automobiles" },
      { name: "description", content: "Punch in and punch out from your phone with live location capture, and see this month's attendance history." },
      { property: "og:title", content: "Mark attendance · KrushiVidhya Automobiles" },
      { property: "og:description", content: "Mobile self-attendance punching with GPS location for dealership staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();
  const { data: employee, isLoading } = useMyEmployee();
  const { data: today } = useTodayAttendance(employee?.id);
  const month = monthStart();
  const { data: history = [] } = useAttendance({
    employeeId: employee?.id,
    from: month,
    to: monthEndExclusive(month),
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const punch = useMutation({
    mutationFn: async (kind: "IN" | "OUT") => {
      let lat = 0;
      let lng = 0;
      let accuracy = 0;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }),
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
          setCoords({ lat, lng, accuracy });
        } catch {
          toast.message("Location unavailable — attendance marked without GPS.");
        }
      }
      const { error } = await supabase.rpc("attendance_punch", {
        _kind: kind,
        _lat: lat,
        _lng: lng,
        _accuracy: accuracy,
        _address: "",
      });
      if (error) throw error;
    },
    onSuccess: (_d, kind) => {
      toast.success(kind === "IN" ? "Punched in" : "Punched out");
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["employee-perf"] });
      qc.invalidateQueries({ queryKey: ["team-perf"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  if (!employee) {
    return (
      <div>
        <PageHeader title="Mark attendance" subtitle="Self-service punch in / punch out" />
        <EmptyState
          title="Your login is not linked to an employee record"
          hint="Ask management to link your login in HR to start marking attendance."
        />
        <AttendanceReportCard />
      </div>
    );
  }

  const punchedIn = !!today?.punch_in_at;
  const punchedOut = !!today?.punch_out_at;
  const dayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="mx-auto w-full max-w-xl pb-8">
      <PageHeader title="Mark attendance" subtitle={dayLabel} />

      <Card className="border-primary/25 bg-primary/5 shadow-card">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{employee.full_name}</p>
              <p className="text-xs text-muted-foreground">{employee.employee_code}</p>
            </div>
            <Badge variant={punchedOut ? "secondary" : punchedIn ? "default" : "outline"}>
              {punchedOut ? "Day closed" : punchedIn ? "Working" : "Not punched in"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="In" value={fmtTime(today?.punch_in_at ?? null)} />
            <Stat label="Out" value={fmtTime(today?.punch_out_at ?? null)} />
            <Stat label="Worked" value={today?.work_minutes ? fmtMinutes(today.work_minutes) : "—"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="lg"
              className="h-16 text-base"
              disabled={punch.isPending || punchedIn}
              onClick={() => punch.mutate("IN")}
            >
              <LogIn className="mr-2 h-5 w-5" /> Punch in
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-16 text-base"
              disabled={punch.isPending || !punchedIn || punchedOut}
              onClick={() => punch.mutate("OUT")}
            >
              <LogOut className="mr-2 h-5 w-5" /> Punch out
            </Button>
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your location and exact time are captured with every punch. Allow location access when your phone asks.
          </p>

          {coords && (
            <p className="text-xs text-muted-foreground">
              Last captured: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)}m
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This month</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No attendance yet this month" hint="Your punches will appear here." />
            </div>
          ) : (
            <ul className="divide-y">
              {history.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {new Date(r.work_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      <span className="ml-2 text-xs text-muted-foreground">{ATTENDANCE_LABEL[r.status] ?? r.status}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {fmtTime(r.punch_in_at)} → {fmtTime(r.punch_out_at)}
                      {mapsLink(r.punch_in_lat, r.punch_in_lng) && (
                        <a
                          className="inline-flex items-center gap-1 underline"
                          href={mapsLink(r.punch_in_lat, r.punch_in_lng) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin className="h-3 w-3" /> Map
                        </a>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{fmtMinutes(r.work_minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AttendanceReportCard />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

/** Excel attendance report: day-wise, week-wise, month-wise and year-wise sheets. */
function AttendanceReportCard() {
  const perms = usePerms();
  const months = recentMonths(12);
  const [month, setMonth] = useState(months[0] ?? monthStart());
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;

  const { data: employees = [] } = useEmployees(true);
  const { data: records = [], isFetching } = useQuery({
    queryKey: ["attendance-report-data", year],
    enabled: perms.can("hr.view"),
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("employee_id, work_date, status, work_minutes")
        .gte("work_date", `${year - 2}-01-01`)
        .lt("work_date", `${year + 1}-01-01`);
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceRecord[];
    },
  });

  if (!perms.can("hr.view")) return null;

  const download = () => {
    const wb = buildAttendanceWorkbook({ employees, records, year, monthIndex });
    XLSX.writeFile(wb, attendanceReportFilename(year, monthIndex));
  };

  return (
    <Card className="mt-5 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Attendance report</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <FilterSelect
            value={month}
            onChange={setMonth}
            className="w-52"
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
          />
          <p className="text-xs text-muted-foreground">
            Excel with day-wise, week-wise, month-wise and year-wise sheets · employee wise · last 3 years.
          </p>
        </div>
        <Button onClick={download} disabled={isFetching}>
          <Download className="mr-2 h-4 w-4" /> Download Excel
        </Button>
      </CardContent>
    </Card>
  );
}
