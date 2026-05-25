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
  const titleId = `${mode}-title`;
  const errorId = `${mode}-error`;

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md space-y-4">
        <h1 id={titleId} className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-gray-600">TradeFinlytix secure access portal</p>
        <form
          className="space-y-4"
          aria-labelledby={titleId}
          aria-describedby={error ? errorId : undefined}
          onSubmit={async (event) => {
            event.preventDefault();
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
          {mode === "register" && (
            <label className="block space-y-1.5" htmlFor="full-name">
              <span className="text-sm font-medium text-gray-700">Full name</span>
              <Input id="full-name" autoComplete="name" required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
          )}
          <label className="block space-y-1.5" htmlFor="email">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <Input id="email" autoComplete="email" inputMode="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1.5" htmlFor="password">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <Input
              id="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p id={errorId} role="alert" className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" disabled={loading} type="submit" aria-busy={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </Button>
        </form>
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
