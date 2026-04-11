import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";

interface TenantContextType {
  tenantId: string;
  isResolved: boolean;
  isSuperboss: boolean;
  switchTenant: (newTenantId: string) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: DEFAULT_TENANT_ID,
  isResolved: true,
  isSuperboss: false,
  switchTenant: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [isResolved, setIsResolved] = useState(false);
  const [isSuperboss, setIsSuperboss] = useState(false);

  useEffect(() => {
    if (!user) {
      setTenantId(DEFAULT_TENANT_ID);
      setIsSuperboss(false);
      setIsResolved(true);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      const [tenantRes, roleRes] = await Promise.all([
        supabase
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1),
        supabase
          .from("tenant_users")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setTenantId(tenantRes.data?.[0]?.tenant_id ?? DEFAULT_TENANT_ID);
      setIsSuperboss(!!roleRes.data);
      setIsResolved(true);
    };

    resolve();
    return () => { cancelled = true; };
  }, [user]);

  const switchTenant = (newTenantId: string) => {
    if (!isSuperboss) return;
    setTenantId(newTenantId);
    queryClient.invalidateQueries();
  };

  if (!isResolved) return null;

  return (
    <TenantContext.Provider value={{ tenantId, isResolved, isSuperboss, switchTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
