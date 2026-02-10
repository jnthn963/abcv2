import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireGovernor?: boolean;
}

const ProtectedRoute = ({ children, requireGovernor = false }: ProtectedRouteProps) => {
  const { user, isLoading, isGovernor } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    const currentPath = window.location.pathname;
    const redirectParam = currentPath && currentPath !== "/" && currentPath !== "/login"
      ? `?redirectTo=${encodeURIComponent(currentPath)}`
      : "";
    return <Navigate to={`/login${redirectParam}`} replace />;
  }

  if (requireGovernor && !isGovernor) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
