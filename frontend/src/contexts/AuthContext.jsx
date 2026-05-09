import React, { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=unauth
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((r) => mounted && setUser(r.data))
      .catch(() => mounted && setUser(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function login(email, password) {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true };
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setError(msg);
      return { ok: false, error: msg };
    }
  }

  async function register(payload) {
    setError("");
    try {
      const { data } = await api.post("/auth/register", payload);
      setUser(data);
      return { ok: true };
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setError(msg);
      return { ok: false, error: msg };
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (_) {}
    setUser(false);
  }

  async function refreshUser() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (_) {}
  }

  return (
    <AuthContext.Provider
      value={{ user, error, login, register, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
