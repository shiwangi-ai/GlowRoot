import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Coarse route gating: bounce anonymous visitors off account pages and checkout
 * to /login with a `?next=` that brings them back.
 *
 * This is **UX only, not authorization.** Middleware runs on the edge runtime,
 * which has no `fs`, so it can't open the session store to validate the token —
 * it can only see whether a cookie is present. A forged cookie sails past this
 * and then hits an action that does the real check.
 *
 * The enforcement lives in the server actions (`placeOrder`, `fetchMyOrders`,
 * `fetchMyOrder`), which resolve the token against the store. Never move an
 * authorization decision up here.
 */
const PROTECTED = ["/account", "/checkout"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const needsSession = PROTECTED.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (!needsSession) return NextResponse.next();

  // /checkout/success is reached straight after ordering; it only renders an
  // order number it was handed, so don't trap people behind a redirect there.
  if (pathname.startsWith("/checkout/success")) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip static assets and image optimisation — nothing there needs a session.
  matcher: ["/((?!_next/static|_next/image|assets|favicon.ico).*)"],
};
