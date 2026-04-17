import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function TrialBadge() {
  const { isTrial, daysLeft, isExpired, isExpiringSoon } = useTrialStatus();

  if (!isTrial) return null;
  if (isExpired) {
    return (
      <Badge variant="destructive" className="gap-1 hidden md:inline-flex">
        <Clock className="h-3 w-3" /> Trial expirado
      </Badge>
    );
  }
  if (daysLeft === null) return null;
  return (
    <Badge
      variant={isExpiringSoon ? "destructive" : "secondary"}
      className="gap-1 hidden md:inline-flex"
    >
      <Clock className="h-3 w-3" />
      Trial: {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
    </Badge>
  );
}
