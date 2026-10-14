"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@glowroot/types";
import { signOut as signOutAction } from "@/app/login/actions";

type AuthState = {
  /** The signed-in customer, or null when logged out. */
  customer: SessionUser | null;
  signIn: (customer: SessionUser) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** The pre-session localStorage key. Cleared on mount; see below. */
const LEGACY_SESSION_KEY = "glowroot.session";

/**
 * Client-side mirror of the *server* session.
 *
 * The session itself lives in an HTTP-only cookie and is resolved server-side in
 * the root layout, which hands the result down as `initialCustomer`. This
 * provider only mirrors it so client components can read identity synchronously
 * without prop-drilling.
 *
 * Two things that used to be here are deliberately gone:
 *  - **localStorage.** The old copy was readable by any script on the page and,
 *    worse, was the *only* thing the server trusted. The cookie is httpOnly.
 *  - **`hydrated`.** With the value server-rendered there is no mount-time gap,
 *    so consumers no longer need to suppress a logged-out flash.
 */
export function AuthProvider({
  children,
  initialCustomer,
}: {
  children: ReactNode;
  initialCustomer: SessionUser | null;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<SessionUser | null>(initialCustomer);

  // Keep in step when the server re-renders — after a sign-in, a sign-out, or
  // any router.refresh() the layout re-resolves the cookie and this follows it.
  useEffect(() => {
    setCustomer(initialCustomer);
  }, [initialCustomer]);

  // One-time cleanup: drop the stale pre-cookie session so it isn't left
  // sitting in browsers that used the old build. Nothing reads it any more.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      /* ignore privacy-mode errors */
    }
  }, []);

  /**
   * Called by AuthForm after a successful sign-in. The cookie is already set by
   * then — this just avoids a round trip before the redirect paints.
   */
  const signIn = useCallback((c: SessionUser) => {
    setCustomer(c);
  }, []);

  const signOut = useCallback(async () => {
    await signOutAction();
    setCustomer(null);
    // Re-render server components so anything holding the old identity (the
    // header, an account page) drops it too.
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ customer, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
