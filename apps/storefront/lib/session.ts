/**
 * The cookie half of auth. Server-side only.
 *
 * `packages/data` owns session *records* (mint, look up, revoke); this module
 * owns the *cookie* that carries the token, because that needs `next/headers`
 * and shouldn't leak a Next dependency into the shared data package.
 *
 * Importing this from a client component is a build error — `next/headers`
 * enforces that on its own, so no extra guard is needed here.
 *
 * Two constraints of Next 14 shape the API:
 *  - `cookies()` is synchronous, but `.set()` only works inside a server action
 *    or a route handler. So `startSession`/`endSession` are only ever called
 *    from actions; RSCs can read but never write.
 *  - Which also means expiry is absolute, not sliding: an RSC render can't
 *    refresh the cookie. 30 days from sign-in, then you log in again.
 */
import { cookies, headers } from "next/headers";
import { createSession, destroySession, readSession } from "@glowroot/data";
import type { SessionUser } from "@glowroot/types";
import { SESSION_COOKIE } from "./session-cookie";

/**
 * Distinct from the admin app's future cookie name on purpose: cookies ignore
 * port, so `localhost:3000` and `localhost:3001` share one jar in dev. Same
 * name would mean the two apps clobber each other's sessions.
 */
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

/**
 * Who is making this request, or `null`. The single source of truth for
 * identity — every action that used to take an `email` argument calls this
 * instead.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await readSession(token);
  return user ?? null;
}

/**
 * Mint a session and set the cookie. Call only from a server action.
 *
 * `httpOnly` is the point of the whole exercise: JavaScript can't read this
 * cookie, so an XSS bug can't lift the session the way it could lift the old
 * `localStorage` copy. `sameSite: "lax"` blocks cross-site POSTs while still
 * surviving a normal top-level navigation back onto the site.
 */
export async function startSession(email: string): Promise<void> {
  const userAgent = (await headers()).get("user-agent") ?? undefined;
  const { token } = await createSession({ email, role: "customer", userAgent });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

/**
 * Revoke server-side *and* clear the cookie. Order matters: revoke first, so a
 * failure can't leave a live session behind an already-cleared cookie.
 */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  cookieStore.delete(SESSION_COOKIE);
}
