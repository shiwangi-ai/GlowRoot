import Link from "next/link";
import { findResetToken } from "@/lib/accounts";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { resetPassword } from "./actions";

export const metadata = { title: "Choose a new password — GlowRoot Admin" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reset = await findResetToken(token);

  if (!reset) {
    return (
      <AuthShell
        eyebrow="Staff access"
        title="Link expired"
        intro="Reset links last 30 minutes and can be used once. Request a new one to continue."
      >
        <Link
          href="/forgot-password"
          className="mt-8 block rounded-full bg-leaf px-5 py-3 text-center font-display text-[15px] font-bold text-white hover:bg-leaf-deep"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Staff access"
      title="Choose a new password"
      intro={`Setting a new password for ${reset.user.email}. Every signed-in device will be signed out.`}
    >
      <SetPasswordForm
        submit={resetPassword.bind(null, token)}
        cta="Save new password"
        redirectTo="/login"
      />
    </AuthShell>
  );
}
