"use client";

import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ── Security logger ───────────────────────────────────────────────────────────
const sec = {
  log:  (...args: unknown[]) => console.log("%c[TFX Security]", "color:#16a34a;font-weight:700;font-family:monospace", ...args),
  warn: (...args: unknown[]) => console.warn("%c[TFX Security]", "color:#f59e0b;font-weight:700;font-family:monospace", ...args),
  err:  (...args: unknown[]) => console.error("%c[TFX Security]", "color:#dc2626;font-weight:700;font-family:monospace", ...args),
};

export const API_SEC = sec;

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  }
});

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("tfx_access_token", access);
    localStorage.setItem("tfx_refresh_token", refresh);
  }
  sec.log("🔑 Session established — JWT access + refresh tokens stored securely in localStorage");
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("tfx_access_token");
    localStorage.removeItem("tfx_refresh_token");
  }
  sec.warn("🚪 Session terminated — all tokens purged from memory and localStorage");
}

export function hydrateTokens() {
  if (typeof window === "undefined") return;
  accessToken = localStorage.getItem("tfx_access_token");
  refreshToken = localStorage.getItem("tfx_refresh_token");
}

if (typeof window !== "undefined") {
  accessToken = localStorage.getItem("tfx_access_token");
  refreshToken = localStorage.getItem("tfx_refresh_token");
  if (accessToken) {
    sec.log("♻️  Session hydrated — existing JWT loaded from localStorage");
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    sec.log(`🔐 JWT Bearer attached — scheme: Bearer | alg: HS256 | method: ${(config.method ?? "GET").toUpperCase()} | endpoint: ${config.url}`);
  } else {
    sec.warn(`⚠️  Unauthenticated request — method: ${(config.method ?? "GET").toUpperCase()} | endpoint: ${config.url}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    sec.log(`✅ Response OK — status: ${response.status} | endpoint: ${response.config.url}`);
    return response;
  },
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;
    const url      = original?.url ?? "";

    if (status === 401 && !original._retry && refreshToken) {
      sec.warn(`🔄 Access token expired (401) on ${url} — initiating silent refresh (JWT rotation)`);
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });
        setTokens(data.access_token, data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        sec.log(`🆕 Token rotation complete — new JWT issued | retrying: ${url}`);
        return api(original);
      } catch (refreshErr) {
        sec.err("❌ Token refresh failed — session invalidated, user must re-authenticate");
        clearTokens();
        return Promise.reject(refreshErr);
      }
    }

    if (status === 403) {
      sec.err(`🚫 Access denied (403) — insufficient permissions for ${url}`);
    } else if (status === 401) {
      sec.warn(`🔒 Unauthenticated (401) — no valid session for ${url}`);
    } else if (status >= 500) {
      sec.err(`💥 Server error (${status}) on ${url}`);
    }

    return Promise.reject(error);
  }
);
