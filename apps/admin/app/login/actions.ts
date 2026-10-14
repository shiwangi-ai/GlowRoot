"use server";

import { authenticate } from "@/lib/accounts";
import { endAdminSession, startAdminSession } from "@/lib/session";

export type AdminLoginResult = { ok: true } | { ok: false; error: string };

export async function loginAdmin(
  email: string,
  password: string,
): Promise<AdminLoginResult> {
  try {
    const result = await authenticate(email, password);
    if (!result.ok) return result;
    await startAdminSession(result.userId);
    return { ok: true };
  } catch (error) {
    console.error("[admin login] sign-in service failed", error);
    return {
      ok: false,
      error: "Sign-in is temporarily unavailable. Please try again shortly.",
    };
  }
}

export async function logoutAdmin(): Promise<void> {
  await endAdminSession();
}
