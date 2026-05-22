"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeTokenLogin } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const nextPath = searchParams.get("next") || "/dashboard";
    const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=google_auth_missing_token");
      return;
    }

    completeTokenLogin(accessToken, refreshToken)
      .then(() => router.replace(safeNext))
      .catch(() => router.replace("/login?error=google_auth_failed"));
  }, [completeTokenLogin, router, searchParams]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FDF4", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#15803D", fontWeight: 700 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        Signing you in with Google...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
