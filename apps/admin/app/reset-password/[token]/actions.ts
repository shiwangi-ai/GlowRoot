"use server";

import { consumePasswordReset } from "@/lib/accounts";

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // No session is started: changing a password signs every device out,
  // including this one, so they sign in again with the new credential.
  return consumePasswordReset(token, password);
}
