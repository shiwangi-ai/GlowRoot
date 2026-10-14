"use client";

import Link from "next/link";
import { useState } from "react";
import { requestReset } from "@/app/forgot-password/actions";
import { AuthNotice, authButtonClass, authInputClass } from "./AuthShell";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await requestReset(email);
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-4">
        <AuthNotice>
          If an account exists for {email}, a reset link is on its way. It
          expires in 30 minutes.
        </AuthNotice>
        <Link
          href="/login"
          className="block rounded-full border border-line px-5 py-3 text-center text-[14px] font-semibold hover:border-leaf"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          Work email
        </span>
        <input
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={authInputClass}
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className={authButtonClass}
      >
        {submitting ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-[13px]">
        <Link href="/login" className="font-semibold text-leaf hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
