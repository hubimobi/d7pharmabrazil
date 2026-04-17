import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export interface TrialStatus {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  daysLeft: number | null;
  isTrial: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean; // ≤ 3 days
}

export function useTrialStatus(): TrialStatus & { isLoading: boolean } {
  const { tenantId, isResolved } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ["trial-status", tenantId],
    enabled: isResolved && !!tenantId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("plan, status, trial_ends_at")
        .eq("id", tenantId)
        .maybeSingle();
      return data as { plan: string; status: string; trial_ends_at: string | null } | null;
    },
  });

  const plan = data?.plan ?? "trial";
  const status = data?.status ?? "active";
  const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
  const isTrial = plan === "trial" || status === "trial";
  const now = Date.now();
  const daysLeft = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now) / (24 * 60 * 60 * 1000))
    : null;
  const isExpired = isTrial && trialEndsAt ? trialEndsAt.getTime() < now : false;
  const isExpiringSoon = isTrial && daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

  return { plan, status, trialEndsAt, daysLeft, isTrial, isExpired, isExpiringSoon, isLoading };
}
