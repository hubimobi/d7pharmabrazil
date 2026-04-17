import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface PlanDefinition {
  plan_key: string;
  display_name: string;
  price_brl: number;
  max_products: number | null;
  max_orders_per_month: number | null;
  max_whatsapp_contacts: number | null;
  max_ai_messages_per_month: number | null;
  max_custom_domains: number | null;
  max_users: number | null;
  allowed_modules: Record<string, boolean>;
}

export type LimitKey =
  | "max_products"
  | "max_orders_per_month"
  | "max_whatsapp_contacts"
  | "max_ai_messages_per_month"
  | "max_custom_domains"
  | "max_users";

export type ModuleKey =
  | "whatsapp"
  | "ai"
  | "repurchase_funnel"
  | "upsell"
  | "analytics"
  | "coupons"
  | "custom_domain";

/**
 * Hook to read the current tenant's plan definition and check limits/modules.
 * NOTE: All plans are currently unlimited (NULL limits). The infrastructure
 * is ready — flip limits in `plan_definitions` to enforce.
 */
export function usePlanLimits() {
  const { tenantId } = useTenant();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["plan-definition", tenantId],
    queryFn: async (): Promise<PlanDefinition | null> => {
      // 1. Get tenant's plan key
      const { data: tenant } = await supabase
        .from("tenants")
        .select("plan")
        .eq("id", tenantId)
        .maybeSingle();

      const planKey = tenant?.plan ?? "free";

      // 2. Get plan definition
      const { data } = await supabase
        .from("plan_definitions")
        .select("*")
        .eq("plan_key", planKey)
        .maybeSingle();

      if (!data) return null;
      return {
        ...data,
        allowed_modules: (data.allowed_modules as Record<string, boolean>) ?? {},
      } as PlanDefinition;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  /** Returns true if the limit is exceeded. NULL limits = unlimited = always false. */
  const isLimitExceeded = (key: LimitKey, currentUsage: number): boolean => {
    if (!plan) return false;
    const limit = plan[key];
    if (limit === null || limit === undefined) return false; // unlimited
    return currentUsage >= limit;
  };

  /** Returns the limit value, or Infinity if unlimited. */
  const getLimit = (key: LimitKey): number => {
    if (!plan) return Infinity;
    const limit = plan[key];
    return limit === null || limit === undefined ? Infinity : limit;
  };

  /** Returns true if the module is enabled for this plan. */
  const hasModule = (key: ModuleKey): boolean => {
    if (!plan) return true; // fail open while loading
    return plan.allowed_modules[key] !== false;
  };

  return {
    plan,
    isLoading,
    isLimitExceeded,
    getLimit,
    hasModule,
  };
}
