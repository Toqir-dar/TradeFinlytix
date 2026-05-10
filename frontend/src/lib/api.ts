"use client";

import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("tfx_access_token");
    localStorage.removeItem("tfx_refresh_token");
  }
}

export function hydrateTokens() {
  if (typeof window === "undefined") return;
  accessToken = localStorage.getItem("tfx_access_token");
  refreshToken = localStorage.getItem("tfx_refresh_token");
}

if (typeof window !== "undefined") {
  accessToken = localStorage.getItem("tfx_access_token");
  refreshToken = localStorage.getItem("tfx_refresh_token");
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;
      const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
        refresh_token: refreshToken
      });
      setTokens(data.access_token, data.refresh_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);
