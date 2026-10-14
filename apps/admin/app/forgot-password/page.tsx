import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata = { title: "Reset your password — GlowRoot Admin" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Staff access"
      title="Reset your password"
      intro="Enter your work email and we will send a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
