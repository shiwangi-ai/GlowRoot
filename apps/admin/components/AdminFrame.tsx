"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AdminNav, type NavIdentity } from "./AdminNav";

/** Unauthenticated screens render bare, without the sidebar. */
const BARE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/invite/",
  "/reset-password/",
];

export function AdminFrame({
  identity,
  children,
}: {
  identity: NavIdentity | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState<boolean | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const screen = window.matchMedia("(min-width: 768px)");
    const update = () => setMenuOpen(screen.matches);
    update();
    screen.addEventListener("change", update);
    return () => screen.removeEventListener("change", update);
  }, []);
  function closeMenu() {
    setMenuOpen(false);
    menuButton.current?.focus();
  }
  function onNavigate() {
    if (!window.matchMedia("(min-width: 768px)").matches) closeMenu();
  }
  const bare = BARE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
  if (bare || !identity) return children;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-paper px-4 md:px-6">
        <button
          ref={menuButton}
          type="button"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen ?? false}
          aria-controls="admin-navigation"
          onClick={() => setMenuOpen((value) => !value)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf"
        >
          <span aria-hidden="true" className="admin-menu-icon">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="flex items-center gap-3">
          <Image
            src="/assets/glowroot-logo-trim.png"
            alt="GlowRoot"
            width={130}
            height={44}
            className="h-11 w-auto"
            priority
          />
          <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-soft">
            Admin
          </span>
        </div>
      </header>
      <div className="flex flex-col md:flex-row">
        <AdminNav
          identity={identity}
          open={menuOpen}
          onNavigate={onNavigate}
          onClose={closeMenu}
        />
        <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
