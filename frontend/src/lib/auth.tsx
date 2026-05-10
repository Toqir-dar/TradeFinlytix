"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, hydrateTokens, setTokens } from "@/lib/api";
import type { Role, UserPublic } from "@/lib/types";

type AuthCtx = {
  user: UserPublic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrateTokens();
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      hasRole: (roles) => !!user && roles.includes(user.role),
      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        setTokens(data.tokens.access_token, data.tokens.refresh_token);
        setUser(data.user);
      },
      register: async (email, password, fullName) => {
        const { data } = await api.post("/auth/register", {
          email,
          password,
          full_name: fullName
        });
        setTokens(data.tokens.access_token, data.tokens.refresh_token);
        setUser(data.user);
      },
      logout: async () => {
        const refreshToken = localStorage.getItem("tfx_refresh_token");
        if (refreshToken) {
          await api.post("/auth/logout", { refresh_token: refreshToken });
        }
        clearTokens();
        setUser(null);
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
