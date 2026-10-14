import "server-only";

import { db } from "@glowroot/db";
import {
  hashPassword,
  hashToken,
  newToken,
  normaliseEmail,
  passwordProblem,
  verifyPassword,
} from "@glowroot/auth";
import { recordAudit } from "./audit";
import { adminBaseUrl, sendMail } from "./mailer";
import { revokeAllSessions } from "./session";

/** Failed sign-ins before the account locks, and for how long. */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const INVITATION_DAYS = 7;
const RESET_MINUTES = 30;

/** One message for every failure, so sign-in cannot be used to enumerate staff. */
const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export type LoginOutcome =
  { ok: true; userId: string } | { ok: false; error: string };

export async function authenticate(
  rawEmail: string,
  password: string,
): Promise<LoginOutcome> {
  const email = normaliseEmail(rawEmail);
  if (!email || !password)
    return { ok: false, error: "Enter your email and password." };

  const user = await db.adminUser.findUnique({ where: { email } });

  // Spend the same work on an unknown address as on a real one, so response
  // time does not reveal whether the account exists.
  if (!user?.passwordHash) {
    verifyPassword(password, `${"0".repeat(32)}:${"0".repeat(64)}`);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000,
    );
    return {
      ok: false,
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  if (user.status !== "ACTIVE") {
    await recordAudit({
      actorUserId: null,
      action: "auth.login_blocked",
      targetType: "admin_user",
      targetId: user.id,
      after: { status: user.status },
    });
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const failed = user.failedLoginCount + 1;
    const locked = failed >= MAX_FAILED_LOGINS;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount: locked ? 0 : failed,
        lockedUntil: locked
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : null,
      },
    });
    await recordAudit({
      actorUserId: null,
      action: locked ? "auth.locked_out" : "auth.login_failed",
      targetType: "admin_user",
      targetId: user.id,
    });
    return {
      ok: false,
      error: locked
        ? `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
        : GENERIC_LOGIN_ERROR,
    };
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordAudit({
    actorUserId: user.id,
    action: "auth.login",
    targetType: "admin_user",
    targetId: user.id,
  });
  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// Invitations — nobody ever types another person's password
// ---------------------------------------------------------------------------

export async function createInvitation(input: {
  email: string;
  name: string;
  roleIds: string[];
  invitedById: string;
}): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const email = normaliseEmail(input.email);
  const name = input.name.trim();
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (!name) return { ok: false, error: "Enter a name." };
  if (!input.roleIds.length)
    return { ok: false, error: "Assign at least one role." };

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing && existing.status !== "INVITED") {
    return {
      ok: false,
      error: "That email already belongs to a staff account.",
    };
  }

  const token = newToken();
  const invitation = await db.$transaction(async (tx) => {
    const user =
      existing ??
      (await tx.adminUser.create({
        data: {
          email,
          name,
          status: "INVITED",
          createdById: input.invitedById,
        },
      }));

    // Supersede any earlier open invitation for this address.
    await tx.adminInvitation.updateMany({
      where: { email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return tx.adminInvitation.create({
      data: {
        email,
        name,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
        invitedById: input.invitedById,
        roles: { create: input.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: true },
    });
  });

  const link = `${adminBaseUrl()}/invite/${token}`;
  await sendMail({
    to: email,
    subject: "You have been invited to GlowRoot Admin",
    body: `Hello ${name},\n\nYou have been invited to the GlowRoot admin panel. Use the link below to verify your email and choose a password. It expires in ${INVITATION_DAYS} days.`,
    link,
  });
  await recordAudit({
    actorUserId: input.invitedById,
    action: "staff.invited",
    targetType: "admin_invitation",
    targetId: invitation.id,
    after: { email, name, roleIds: input.roleIds },
  });

  return { ok: true, link };
}

/** Reads an invitation for the accept screen without consuming it. */
export async function findInvitation(token: string) {
  const invitation = await db.adminInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { roles: { include: { role: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.revokedAt) return null;
  if (invitation.expiresAt <= new Date()) return null;
  return invitation;
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };

  const invitation = await findInvitation(token);
  if (!invitation)
    return {
      ok: false,
      error: "That invitation is no longer valid. Ask for a new one.",
    };

  const user = await db.$transaction(async (tx) => {
    const account = await tx.adminUser.upsert({
      where: { email: invitation.email },
      update: {
        name: invitation.name,
        status: "ACTIVE",
        passwordHash: hashPassword(password),
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        email: invitation.email,
        name: invitation.name,
        status: "ACTIVE",
        passwordHash: hashPassword(password),
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    });

    for (const link of invitation.roles) {
      await tx.adminUserRole.upsert({
        where: { userId_roleId: { userId: account.id, roleId: link.roleId } },
        update: {},
        create: {
          userId: account.id,
          roleId: link.roleId,
          assignedBy: invitation.invitedById,
        },
      });
    }

    await tx.adminInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return account;
  });

  await recordAudit({
    actorUserId: user.id,
    action: "staff.invitation_accepted",
    targetType: "admin_user",
    targetId: user.id,
    after: { roleIds: invitation.roles.map((r) => r.roleId) },
  });
  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/**
 * Always resolves the same way, whether or not the address is registered — the
 * caller shows one message either way.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normaliseEmail(rawEmail);
  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user || user.status === "DISABLED") return;

  const token = newToken();
  await db.adminPasswordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
    },
  });

  await sendMail({
    to: email,
    subject: "Reset your GlowRoot Admin password",
    body: `A password reset was requested for this account. The link below expires in ${RESET_MINUTES} minutes and can be used once. If this was not you, ignore this message.`,
    link: `${adminBaseUrl()}/reset-password/${token}`,
  });
  await recordAudit({
    actorUserId: null,
    action: "auth.reset_requested",
    targetType: "admin_user",
    targetId: user.id,
  });
}

export async function findResetToken(token: string) {
  const reset = await db.adminPasswordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return null;
  if (reset.user.status === "DISABLED") return null;
  return reset;
}

export async function consumePasswordReset(
  token: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem };

  const reset = await findResetToken(token);
  if (!reset)
    return {
      ok: false,
      error: "That reset link has expired or was already used.",
    };

  await db.$transaction([
    db.adminUser.update({
      where: { id: reset.userId },
      data: {
        passwordHash: hashPassword(password),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        // An invited user who resets instead of accepting still becomes active.
        status: "ACTIVE",
      },
    }),
    db.adminPasswordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
    // Single-use in spirit as well as fact: burn every other outstanding token.
    db.adminPasswordReset.updateMany({
      where: { userId: reset.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  const revoked = await revokeAllSessions(reset.userId);
  await sendMail({
    to: reset.user.email,
    subject: "Your GlowRoot Admin password was changed",
    body: `Your password was just changed and ${revoked} active session${revoked === 1 ? "" : "s"} were signed out. If this was not you, contact the owner immediately.`,
  });
  await recordAudit({
    actorUserId: reset.userId,
    action: "auth.password_reset",
    targetType: "admin_user",
    targetId: reset.userId,
    after: { sessionsRevoked: revoked },
  });
  return { ok: true };
}
