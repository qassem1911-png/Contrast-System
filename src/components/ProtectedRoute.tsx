import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, requireRoles }: ProtectedRouteProps) => {
  const { user, roles, loading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 gradient-surface">
        <Logo size="md" />
        <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRoles && requireRoles.length > 0 && !isSuperAdmin) {
    const hasAccess = requireRoles.some((r) => roles.includes(r));
    if (!hasAccess) return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
