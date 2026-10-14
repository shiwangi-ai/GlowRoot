import "server-only";

import { cookies, headers } from "next/headers";
import { db } from "@glowroot/db";
import { hashToken, newToken } from "@glowroot/auth";

/**
 * Admin sessions are opaque and database-backed.
 *
 * The cookie carries 32 random bytes; only the SHA-256 digest is stored, so a
 * leaked `admin_sessions` table cannot be replayed as a login. Because the
 * record lives server-side, disabling a user or changing a password can revoke
 * every session immediately — a signed JWT could not be taken back.
 *
 * The cookie name differs from the storefront's `gr_session` on purpose:
 * cookies ignore port, so :3000 and :3001 share one jar in development.
 */
export const ADMIN_SESSION_COOKIE = "gr_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    ipAddress: forwarded?.split(",")[0]?.trim() || null,
    userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
  };
}

/** Mints a session row and writes the cookie. Server actions only. */
export async function startAdminSession(userId: string): Promise<void> {
  const token = newToken();
  const { ipAddress, userAgent } = await requestMeta();

  await db.adminSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000),
      ipAddress,
      userAgent,
    },
  });

  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

/**
 * Resolves the cookie to a live session, or null. Safe to call from a server
 * component — it never writes the cookie, only the `last_seen_at` column.
 */
export async function readAdminSession() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date())
    return null;
  // A suspended or disabled account loses access on its next request.
  if (session.user.status !== "ACTIVE") return null;

  void db.adminSession
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return session;
}

/** Revokes the current session and clears the cookie. */
export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await db.adminSession
      .updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  jar.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Revokes every session for a user. Called after a password change and when an
 * account is suspended or disabled — "disabled users must immediately lose
 * every active session".
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const { count } = await db.adminSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count;
}
