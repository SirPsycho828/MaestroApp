import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  role: UserRole;
}

export function RoleGuard({ role }: RoleGuardProps) {
  const { role: userRole } = useAuth();

  if (userRole !== role) {
    const redirectTo = userRole === "teacher" ? "/dashboard" : "/home";
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
