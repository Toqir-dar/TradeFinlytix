"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-gray-600">TradeFinlytix secure access portal</p>
        {mode === "register" && (
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        )}
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          className="w-full"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              if (mode === "login") await login(email, password);
              else await register(email, password, fullName);
              router.push("/dashboard");
            } catch {
              setError("Authentication failed. Check details and retry.");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </Button>
        <p className="text-sm text-gray-600">
          {mode === "login" ? "No account?" : "Already have an account?"}{" "}
          <Link className="text-green-700 font-medium" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Register" : "Login"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
