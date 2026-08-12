import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, signOutAndRedirect } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sales/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const ROLE_LABEL: Record<string, string> = {
  ceo: "CEO / Dealer",
  manager: "Manager",
  salesman: "Salesman",
  receptionist: "Receptionist",
};

function AuthenticatedLayout() {
  const { data: me, isLoading } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutAndRedirect(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-2 backdrop-blur sm:px-4">
            <SidebarTrigger />

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold leading-tight">
                  {me?.profile?.full_name ?? "…"}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  {me?.roles?.map((r) => ROLE_LABEL[r]).join(", ") || "No role"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">
            {isLoading ? (
              <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
            ) : me && !me.hasRole ? (
              <NoRole onSignOut={handleSignOut} />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function NoRole({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center shadow-card">
      <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
      <h2 className="mt-4 text-lg font-bold">Awaiting role assignment</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account has been created but no sales role has been assigned yet. Ask the dealer or a
        manager to assign your role in Team &amp; Roles.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Badge variant="outline">Pending approval</Badge>
      </div>
      <Button variant="outline" className="mt-5" onClick={onSignOut}>
        Sign out
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        Wrong account? <Link to="/auth" className="underline">Use another login</Link>
      </p>
    </div>
  );
}
