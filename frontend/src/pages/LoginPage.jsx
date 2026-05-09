import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint } from "lucide-react";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) navigate(location.state?.from?.pathname || "/dashboard");
    else setErr(res.error);
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2" data-testid="login-brand">
          <div className="h-8 w-8 rounded-md bg-[#E06A4F] flex items-center justify-center">
            <PawPrint className="h-4 w-4 text-white" strokeWidth={2.4} />
          </div>
          <span className="font-display font-black text-lg text-[#1A2F24]">
            Findr
          </span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bento-card p-8">
          <h1 className="font-display text-3xl font-black tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-[#4A5F54]">
            Sign in to continue with reports and alerts.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="mt-1"
              />
            </div>
            {err && (
              <p className="text-sm text-[#C95B42]" data-testid="login-error">
                {err}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              data-testid="login-submit-button"
              className="w-full bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-[#4A5F54] text-center">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-[#E06A4F] hover:text-[#C95B42]"
              data-testid="login-to-signup-link"
            >
              Sign up
            </Link>
          </p>
          <div className="mt-6 rounded-md bg-[#F4F1EA] p-3 text-xs text-[#4A5F54]">
            <div className="font-semibold mb-1">Demo accounts (showcase)</div>
            <div>admin@findr.app / admin123</div>
            <div>ngo@findr.app / ngo123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
