/** Opaque customer sessions stored in PostgreSQL. Only token hashes persist. */
import { db } from "@glowroot/db";
import type { SessionRecord, SessionRole } from "@glowroot/types";
import { hashToken, newToken, normaliseEmail } from "@glowroot/auth";

export const newSessionToken = newToken;
export const hashSessionToken = hashToken;
const TTL_DAYS = 30;

export async function insertSession(input: {
  email: string;
  role: SessionRole;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: string }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86400000);
  await db.customerSession.create({
    data: {
      tokenHash: hashToken(token),
      customer: { connect: { email: normaliseEmail(input.email) } },
      role: input.role,
      expiresAt,
      userAgent: input.userAgent,
    },
  });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function findSession(
  token: string,
): Promise<SessionRecord | undefined> {
  if (!token) return undefined;
  const row = await db.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: { select: { email: true } } },
  });
  if (!row || row.expiresAt <= new Date()) return undefined;
  return {
    tokenHash: row.tokenHash,
    email: row.customer.email,
    role: row.role as SessionRole,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    userAgent: row.userAgent ?? undefined,
  };
}

export async function deleteSession(token: string): Promise<void> {
  if (token)
    await db.customerSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
}

export async function deleteSessionsForEmail(email: string): Promise<void> {
  await db.customerSession.deleteMany({
    where: { customer: { email: normaliseEmail(email) } },
  });
}
