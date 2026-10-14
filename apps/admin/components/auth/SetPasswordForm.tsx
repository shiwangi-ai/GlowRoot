"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, authButtonClass, authInputClass } from "./AuthShell";

/** Shared by the invitation and password-reset screens. */
export function SetPasswordForm({
  submit,
  cta,
  redirectTo,
}: {
  submit: (
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  cta: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || mismatch) return;
    setSubmitting(true);
    setError(null);
    const result = await submit(password);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          New password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={authInputClass}
        />
        <span className="mt-1.5 block text-[12px] text-ink-soft">
          At least 12 characters, including a letter and a number.
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          Confirm password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={authInputClass}
        />
      </label>
      {mismatch ? <AuthError>Those passwords do not match.</AuthError> : null}
      {error ? <AuthError>{error}</AuthError> : null}
      <button
        type="submit"
        disabled={submitting || !password || mismatch}
        className={authButtonClass}
      >
        {submitting ? "Saving…" : cta}
      </button>
    </form>
  );
}
