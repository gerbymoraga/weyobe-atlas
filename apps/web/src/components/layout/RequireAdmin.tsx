import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/** Gate admin routes to members.is_admin (Atlas Superadmin). */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { member, loading } = useAuth();
  if (loading) return null;
  if (!member?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
