import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint } from "lucide-react";

export default function SignupPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    ngo_name: "",
    phone: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function set(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const payload = { ...form };
    if (payload.role !== "ngo") delete payload.ngo_name;
    const res = await register(payload);
    setBusy(false);
    if (res.ok) navigate("/dashboard");
    else setErr(res.error);
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-2" data-testid="signup-brand">
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
            Create account
          </h1>
          <p className="mt-2 text-sm text-[#4A5F54]">
            Join as a community member or NGO partner.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 p-1 bg-[#F4F1EA] rounded-md">
            <button
              type="button"
              onClick={() => set("role", "user")}
              data-testid="role-user-button"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                form.role === "user"
                  ? "bg-white text-[#1A2F24] shadow"
                  : "text-[#4A5F54]"
              }`}
            >
              Community member
            </button>
            <button
              type="button"
              onClick={() => set("role", "ngo")}
              data-testid="role-ngo-button"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                form.role === "ngo"
                  ? "bg-white text-[#1A2F24] shadow"
                  : "text-[#4A5F54]"
              }`}
            >
              NGO / Rescue
            </button>
          </div>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                data-testid="signup-name-input"
                className="mt-1"
              />
            </div>
            {form.role === "ngo" && (
              <div>
                <Label htmlFor="ngo_name">Organization name</Label>
                <Input
                  id="ngo_name"
                  value={form.ngo_name}
                  onChange={(e) => set("ngo_name", e.target.value)}
                  required
                  data-testid="signup-ngo-name-input"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
                data-testid="signup-email-input"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                data-testid="signup-phone-input"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password (min 6 chars)</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
                minLength={6}
                data-testid="signup-password-input"
                className="mt-1"
              />
            </div>
            {err && (
              <p className="text-sm text-[#C95B42]" data-testid="signup-error">
                {err}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              data-testid="signup-submit-button"
              className="w-full bg-[#E06A4F] hover:bg-[#C95B42] text-white rounded-md"
            >
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-[#4A5F54] text-center">
            Already a member?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#E06A4F] hover:text-[#C95B42]"
              data-testid="signup-to-login-link"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
