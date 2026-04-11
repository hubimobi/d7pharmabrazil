import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";

export default function RequireSuperboss({ children }: { children: ReactNode }) {
  const { isSuperboss, isResolved } = useTenant();
  if (!isResolved) return null;
  if (!isSuperboss) return <Navigate to="/" replace />;
  return <>{children}</>;
}
