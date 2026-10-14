"use server";

import { acceptInvitation } from "@/lib/accounts";
import { startAdminSession } from "@/lib/session";

export async function acceptInvite(
  token: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await acceptInvitation(token, password);
  if (!result.ok) return result;
  // Signing them straight in saves a redundant login right after verifying.
  await startAdminSession(result.userId);
  return { ok: true };
}
