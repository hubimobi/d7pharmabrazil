import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isFinanceiro: boolean;
  isGestor: boolean;
  isAdministrador: boolean;
  isSuporte: boolean;
  isRepresentative: boolean;
  isPrescriber: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hierarchy: super_admin > suporte > administrador > gestor > financeiro > admin > representative > prescriber
const ADMIN_LIKE_ROLES: AppRole[] = ["super_admin", "suporte", "administrador", "gestor", "financeiro", "admin"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles(data?.map((r) => r.role) ?? []);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRoles(session.user.id), 0);
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyAdminRole = ADMIN_LIKE_ROLES.some((r) => roles.includes(r));

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles,
        isAdmin: hasAnyAdminRole,
        isSuperAdmin: hasRole("super_admin" as AppRole),
        isFinanceiro: hasRole("financeiro" as AppRole) || hasRole("super_admin" as AppRole),
        isGestor: hasRole("gestor" as AppRole) || hasRole("super_admin" as AppRole),
        isAdministrador: hasRole("administrador" as AppRole) || hasRole("super_admin" as AppRole),
        isSuporte: hasRole("suporte" as AppRole) || hasRole("super_admin" as AppRole),
        isRepresentative: hasRole("representative" as AppRole),
        isPrescriber: hasRole("prescriber" as AppRole),
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
