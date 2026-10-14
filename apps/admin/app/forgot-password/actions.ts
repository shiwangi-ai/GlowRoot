"use server";

import { requestPasswordReset } from "@/lib/accounts";

/**
 * Always resolves the same way. Whether or not the address exists, the caller
 * shows one message — a reset form must not confirm who has an account.
 */
export async function requestReset(email: string): Promise<{ ok: true }> {
  await requestPasswordReset(email);
  return { ok: true };
}
