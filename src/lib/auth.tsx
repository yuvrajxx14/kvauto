import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "ceo"
  | "manager"
  | "salesman"
  | "receptionist"
  | "workshop_manager"
  | "mechanic";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

/**
 * Loads the signed-in staff member's profile + roles.
 * The very first user of a fresh dealership install bootstraps as CEO/Dealer.
 */
export function useMe() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      // Ensure a profile row exists for this staff member.
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .eq("id", user.id)
        .maybeSingle();

      let profile = existing;
      if (!profile) {
        const { data: inserted, error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: (user.user_metadata?.['full_name'] as string) || user.email || "Staff",
            email: user.email ?? null,
            phone: (user.user_metadata?.['phone'] as string) ?? null,
          })
          .select("id, full_name, created_at")
          .single();
        if (error) throw error;
        profile = inserted;
      }


      let { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

      if (!roles || roles.length === 0) {
        const { count } = await supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true });
        if ((count ?? 0) === 0) {
          const { data: bootstrapped } = await supabase
            .from("user_roles")
            .insert({ user_id: user.id, role: "ceo" })
            .select("role");
          roles = bootstrapped ?? [];
        }
      }

      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      return {
        profile,
        roles: roleList,
        isManagement: roleList.includes("ceo") || roleList.includes("manager"),
        isWorkshop:
          roleList.includes("ceo") ||
          roleList.includes("manager") ||
          roleList.includes("workshop_manager") ||
          roleList.includes("mechanic"),
        isWorkshopManager: roleList.includes("workshop_manager"),
        isMechanic: roleList.includes("mechanic"),
        isReceptionist: roleList.includes("receptionist"),
        isSalesman: roleList.includes("salesman"),
        hasRole: roleList.length > 0,
      };
    },
  });
}

export async function signOutAndRedirect(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}
