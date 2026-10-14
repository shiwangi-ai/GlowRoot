"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/app/login/actions";
import { AuthError, authButtonClass, authInputClass } from "./auth/AuthShell";

function safeDestination(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await loginAdmin(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(safeDestination(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("Could not reach the sign-in service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          Work email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={authInputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authInputClass}
        />
      </label>
      {error ? <AuthError>{error}</AuthError> : null}
      <button
        type="submit"
        disabled={submitting || !email.trim() || !password}
        className={authButtonClass}
      >
        {submitting ? "Signing in…" : "Sign in to admin"}
      </button>
      <p className="text-center text-[13px]">
        <Link
          href="/forgot-password"
          className="font-semibold text-leaf hover:underline"
        >
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
