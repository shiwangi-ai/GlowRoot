"use server";

import { createUser, getCustomerByEmail, verifyUser } from "@glowroot/data";
import type { SessionUser } from "@glowroot/types";
import { endSession, getSessionUser, startSession } from "@/lib/session";

export type AuthResult =
  { ok: true; customer: SessionUser } | { ok: false; error: string };

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign in against the persisted user store (`packages/data/src/users.ts`).
 *
 * Passwords are salted PBKDF2 digests compared server-side. On success this
 * mints a server session and sets an HTTP-only cookie — from here on the server
 * knows who the caller is, and no action needs to take its identity from an
 * argument.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const clean = email.trim().toLowerCase();
  if (!emailRe.test(clean)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!password) {
    return { ok: false, error: "Enter your password." };
  }

  const result = await verifyUser(clean, password);
  if (!result.ok) {
    switch (result.reason) {
      case "not-found":
        return {
          ok: false,
          error:
            "We couldn't find an account for that email — create one below.",
        };
      case "no-password":
        // They've ordered as a guest but never registered. Signing up with the
        // same email attaches credentials to that record, history and all.
        return {
          ok: false,
          error:
            "You've ordered with this email but haven't set a password yet — create your account below.",
        };
      default:
        return { ok: false, error: "That password doesn't match. Try again." };
    }
  }

  const { user } = result;
  await startSession(user.email);

  return {
    ok: true,
    customer: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      pincode: user.pincode,
      role: "customer",
    },
  };
}

/**
 * Register an account, persisted to the user store, then sign them straight in.
 * If the email already has orders from a guest checkout, this claims that record
 * rather than creating a duplicate — so the customer's history is there the
 * moment they sign up.
 */
export async function signUp(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Enter your full name." };
  if (!emailRe.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const created = await createUser({ ...input, name, email });
  if (!created.ok) {
    return {
      ok: false,
      error: "An account with that email already exists — log in instead.",
    };
  }

  // Pull through anything a past guest order already told us about them.
  const known = await getCustomerByEmail(email);
  const { user } = created;
  await startSession(user.email);

  return {
    ok: true,
    customer: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? known?.phone,
      address: user.address ?? known?.address,
      pincode: user.pincode,
      role: "customer",
    },
  };
}

/** Revoke the session server-side and clear the cookie. */
export async function signOut(): Promise<void> {
  await endSession();
}

/**
 * Read the current session from a client component. The header and checkout get
 * their initial value server-rendered via the root layout; this exists so a
 * client component can re-read after a sign-in without a full reload.
 */
export async function fetchSession(): Promise<SessionUser | null> {
  return getSessionUser();
}
