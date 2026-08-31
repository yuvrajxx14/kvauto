import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMinutes, fmtTime, useMyEmployee, useTodayAttendance } from "@/lib/hr";

/** Self-service attendance punch. Location + exact time are captured, never blocking. */
export function PunchCard({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const { data: employee, isLoading } = useMyEmployee();
  const { data: today } = useTodayAttendance(employee?.id);

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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  if (!employee) {
    return (
      <Card className="border-warning/40">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <MapPin className="h-4 w-4 text-warning" />
          <span>
            Your login is not linked to an employee record yet — ask management to link it in{" "}
            <Link to="/hr" className="underline">
              HR
            </Link>{" "}
            to start marking attendance.
          </span>
        </CardContent>
      </Card>
    );
  }

  const punchedIn = !!today?.punch_in_at;
  const punchedOut = !!today?.punch_out_at;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className={`flex flex-col gap-4 ${compact ? "p-4" : "p-5"} sm:flex-row sm:items-center sm:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Attendance · {employee.full_name.split(" ")[0]}</p>
            <Badge variant={punchedOut ? "secondary" : punchedIn ? "default" : "outline"}>
              {punchedOut ? "Day closed" : punchedIn ? "Working" : "Not punched in"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {punchedIn
              ? `In ${fmtTime(today?.punch_in_at ?? null)}${punchedOut ? ` · Out ${fmtTime(today?.punch_out_at ?? null)} · ${fmtMinutes(today?.work_minutes ?? 0)}` : " · still working"}`
              : "Location and exact time are recorded when you punch."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={punch.isPending || punchedIn} onClick={() => punch.mutate("IN")}>
            <LogIn className="mr-2 h-4 w-4" /> Punch in
          </Button>
          <Button variant="outline" disabled={punch.isPending || !punchedIn || punchedOut} onClick={() => punch.mutate("OUT")}>
            <LogOut className="mr-2 h-4 w-4" /> Punch out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
