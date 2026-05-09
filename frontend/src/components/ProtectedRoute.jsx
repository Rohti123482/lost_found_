import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) {
    return (
      <div
        data-testid="auth-loading"
        className="flex h-screen items-center justify-center text-sm text-stone-500"
      >
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
