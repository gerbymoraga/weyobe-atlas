import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function RequireAuth() {
  const { member, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink font-ui text-bone/60">
        Loading…
      </div>
    );
  }

  if (!member) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
