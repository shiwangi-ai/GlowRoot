import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse route gating only.
 *
 * Admin sessions are opaque tokens validated against `admin_sessions`, and
 * middleware runs on the edge runtime where Prisma cannot reach Postgres. So
 * all this can see is whether a cookie is present — a forged cookie sails past
 * it and then fails the real check.
 *
 * The enforcement lives in `requireAdmin()` / `requirePermission()` (pages) and
 * `checkPermission()` (server actions), which resolve the token against the
 * database. Never move an authorization decision up here.
 */
const COOKIE = "gr_admin_session";

/** Reachable without a session; everything else needs one. */
const PUBLIC_PREFIXES = [
  "/login",
  "/forgot-password",
  "/invite/",
  "/reset-password/",
  "/media/products/",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix),
    )
  ) {
    return NextResponse.next();
  }

  if (request.cookies.has(COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  const destination = `${pathname}${search}`;
  if (destination !== "/") login.searchParams.set("next", destination);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|assets|favicon.ico).*)"],
};
