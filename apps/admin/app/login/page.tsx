import { Suspense } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata = { title: "Admin sign in — GlowRoot" };

export default function AdminLoginPage() {
  return (
    <AuthShell
      eyebrow="Staff access"
      title="Welcome back"
      intro="Sign in to manage orders, products, and inventory."
      footer="Authorized GlowRoot staff only."
    >
      <Suspense
        fallback={<p className="mt-8 text-[14px] text-ink-soft">Loading…</p>}
      >
        <AdminLoginForm />
      </Suspense>
    </AuthShell>
  );
}
