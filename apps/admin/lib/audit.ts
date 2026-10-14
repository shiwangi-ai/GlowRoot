import "server-only";

import { headers } from "next/headers";
import { db } from "@glowroot/db";
import type { Prisma } from "@glowroot/db";

/**
 * Append-only record of privileged actions. Role changes, refunds, exports, and
 * every account-lifecycle event write a row here.
 *
 * Auditing must never break the operation it is recording, so failures are
 * swallowed and logged rather than thrown.
 */
export async function recordAudit(entry: {
  actorUserId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    const h = await headers();
    await db.adminAuditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        beforeData: entry.before,
        afterData: entry.after,
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", entry.action, error);
  }
}
