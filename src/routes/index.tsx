import { createFileRoute, Link } from "@tanstack/react-router";
import { Tractor, ShieldCheck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import heroImage from "@/assets/hero-tractor.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KrushiVidhya Automobiles — Dealership ERP" },
      {
        name: "description",
        content:
          "Internal operations portal for KrushiVidhya Automobiles, authorised Mahindra tractor dealership.",
      },
      { property: "og:title", content: "KrushiVidhya Automobiles — Dealership ERP" },
      {
        property: "og:description",
        content: "Authorised staff access only. Internal dealership management portal.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Backdrop */}
      <img
        src={heroImage}
        alt="Mahindra tractor in a field at sunrise"
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-raised">
            <Tractor className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide text-white">KrushiVidhya Automobiles</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              Authorised Mahindra Dealership
            </p>
          </div>
        </div>
        {!loading && session && (
          <Button asChild variant="secondary" size="sm">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        )}
      </header>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 items-center px-6 sm:px-10 lg:px-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/90">
            Dealership Management System
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            KrushiVidhya
            <br />
            Automobiles
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
            The internal operations portal for our sales, service, spares and accounts teams —
            from first inquiry to final delivery.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            {loading ? null : session ? (
              <Button asChild size="lg" className="gap-2 px-7 text-base">
                <Link to="/dashboard">
                  Open Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="gap-2 px-7 text-base">
                <Link to="/auth">
                  Staff Sign In <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <footer className="relative z-10 flex flex-col gap-2 border-t border-white/10 px-6 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-300/80" />
          <span>Restricted access — authorised dealership staff only. All activity is logged.</span>
        </div>
        <span>© {new Date().getFullYear()} KrushiVidhya Automobiles · Jasdan</span>
      </footer>
    </main>
  );
}
