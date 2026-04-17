import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface UpgradeBannerProps {
  title?: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Shown when a tenant hits a plan limit. Currently never auto-displayed
 * because all plans are unlimited — components import this and pass
 * `usePlanLimits().isLimitExceeded(...)` to gate it.
 */
export function UpgradeBanner({
  title = "Limite do plano atingido",
  message,
  ctaLabel = "Ver planos",
  ctaHref = "/admin/assinatura",
}: UpgradeBannerProps) {
  return (
    <Alert className="border-primary/40 bg-primary/5">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        <Button asChild size="sm" variant="default">
          <Link to={ctaHref}>{ctaLabel}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
