import Link from "next/link";
import { findInvitation } from "@/lib/accounts";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { acceptInvite } from "./actions";

export const metadata = { title: "Accept your invitation — GlowRoot Admin" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await findInvitation(token);

  if (!invitation) {
    return (
      <AuthShell
        eyebrow="Staff access"
        title="Invitation not valid"
        intro="This invitation has expired, been revoked, or was already used. Ask an owner to send a new one."
      >
        <Link
          href="/login"
          className="mt-8 block rounded-full border border-line px-5 py-3 text-center text-[14px] font-semibold hover:border-leaf"
        >
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  const roles = invitation.roles.map((link) => link.role.name);
  const mfaRoles = invitation.roles
    .filter((link) => link.role.requiresMfa)
    .map((link) => link.role.name);

  return (
    <AuthShell
      eyebrow="Staff access"
      title={`Welcome, ${invitation.name.split(" ")[0]}`}
      intro={`Choose a password for ${invitation.email}. Nobody else can see or set it.`}
    >
      <div className="mt-6 rounded-2xl border border-line bg-cream p-4">
        <div className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">
          You will be given
        </div>
        <ul className="mt-2 space-y-1 text-[13px]">
          {roles.map((role) => (
            <li key={role}>✓ {role}</li>
          ))}
        </ul>
        {mfaRoles.length ? (
          <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-soft">
            {mfaRoles.join(" and ")} require two-factor authentication. You will
            be asked to enrol once that is available.
          </p>
        ) : null}
      </div>
      <SetPasswordForm
        submit={acceptInvite.bind(null, token)}
        cta="Create my account"
        redirectTo="/"
      />
    </AuthShell>
  );
}
