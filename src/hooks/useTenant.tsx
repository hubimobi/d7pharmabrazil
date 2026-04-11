import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";

interface TenantContextType {
  tenantId: string;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: DEFAULT_TENANT_ID,
  isLoading: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setTenantId(DEFAULT_TENANT_ID);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        setTenantId(data?.[0]?.tenant_id ?? DEFAULT_TENANT_ID);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenantId, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
