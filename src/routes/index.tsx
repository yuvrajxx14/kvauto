import { createFileRoute, Link } from "@tanstack/react-router";
import { Tractor, ClipboardList, Users, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KrushiVidhya Automobiles — Sales Module" },
      {
        name: "description",
        content:
          "Internal dealership ERP for KrushiVidhya Automobiles: inquiries, follow-ups, demos, bookings and tractor allocation.",
      },
      { property: "og:title", content: "KrushiVidhya Automobiles — Sales Module" },
      {
        property: "og:description",
        content: "Internal Mahindra tractor dealership ERP — sales pipeline from inquiry to delivery.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Tractor className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight">KrushiVidhya Automobiles</h1>
        <p className="mt-2 text-muted-foreground">
          Mahindra Tractor Dealership — internal Sales Module
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[
            { icon: ClipboardList, t: "Inquiry to Delivery", d: "Full tractor sales pipeline" },
            { icon: PhoneCall, t: "Follow-up Control", d: "Today, overdue & upcoming" },
            { icon: BookCheck, t: "Bookings", d: "Payments & tractor allocation" },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <f.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-semibold">{f.t}</p>
              <p className="text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          {loading ? null : session ? (
            <Button asChild size="lg">
              <Link to="/dashboard">Open Sales Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/auth">Staff Sign In</Link>
            </Button>
          )}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Authorised dealership staff only. All activity is logged.
        </p>
      </div>
    </main>
  );
}
