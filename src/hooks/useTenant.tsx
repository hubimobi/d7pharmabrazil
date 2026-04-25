import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_TENANT_ID } from "@/constants/tenant";

interface TenantResolution {
  tenant_id: string;
  slug: string;
  plan: string;
  status: string;
  allowed_modules: Record<string, boolean>;
  store_settings: Record<string, unknown> | null;
}

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

// ── In-memory cache with 5-min TTL ──
const tenantCache = new Map<string, { data: TenantResolution; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getHostname(): string {
  try {
    return window.location.hostname.toLowerCase().trim();
  } catch {
    return "localhost";
  }
}

async function fetchTenantResolution(): Promise<TenantResolution | null> {
  const hostname = getHostname();

  // Fast path: localhost → default immediately, no network call
  if (!hostname || hostname === "localhost") {
    return null; // signals "use DEFAULT_TENANT_ID"
  }

  // Check in-memory cache
  const cached = tenantCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Call resolve-tenant with a client-side timeout guard
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const invokePromise = supabase.functions.invoke("resolve-tenant", {
      method: "GET",
      headers: { "x-forwarded-host": hostname },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Tenant resolution timed out")), 3000);
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (timeout) clearTimeout(timeout);

    if (error || !data?.tenant_id) {
      return null;
    }

    const resolution = data as TenantResolution;

    // Cache the result
    tenantCache.set(hostname, {
      data: resolution,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return resolution;
  } catch {
    if (timeout) clearTimeout(timeout);
    return null; // fallback to DEFAULT
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [isResolved, setIsResolved] = useState(false);
  const [isSuperboss, setIsSuperboss] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Reset resolved state when user changes to prevent premature redirects
    setIsResolved(false);

    const resolve = async () => {
      // 1. Resolve tenant by hostname (works for anon AND logged-in users)
      const resolution = await fetchTenantResolution();
      if (cancelled) return;

      const resolvedTenantId = resolution?.tenant_id ?? DEFAULT_TENANT_ID;
      setTenantId(resolvedTenantId);

      // 2. For logged-in users, check super_admin status separately
      if (user) {
        // Check both tenant_users AND user_roles for super_admin
        const [{ data: tenantRole }, { data: userRole }] = await Promise.all([
          supabase
            .from("tenant_users")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "super_admin")
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "super_admin")
            .maybeSingle(),
        ]);

        if (cancelled) return;
        setIsSuperboss(!!tenantRole || !!userRole);

        // If user is bound to a specific tenant via tenant_users,
        // override hostname resolution for admin context
        const { data: tenantRow } = await supabase
          .from("tenant_users")
          .select("tenant_id")
          .eq("user_id", user.id)
          .limit(1);

        if (cancelled) return;
        if (tenantRow?.[0]?.tenant_id) {
          setTenantId(tenantRow[0].tenant_id);
        }
      } else {
        setIsSuperboss(false);
      }

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
