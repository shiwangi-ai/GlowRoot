"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "@glowroot/ui";
import { PincodeControl } from "./PincodeControl";
import { CartButton } from "./CartButton";
import { useAuth } from "./AuthProvider";
import { BrandFilm } from "./BrandFilm";
import { ThemeToggle } from "./ThemeToggle";

/** Up-to-two-letter initials for the account avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

/** Desktop account control: a "Log in" link when logged out, a chip + menu when in. */
function AccountControl() {
  const { customer, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Logged out: the way in. Without this the /login page is URL-only.
  if (!customer) {
    return (
      <Link
        href="/login"
        className="text-[14px] font-semibold text-ink-soft hover:text-leaf transition-colors"
      >
        Log in
      </Link>
    );
  }

  const firstName = customer.name.trim().split(/\s+/)[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-full border border-line bg-cream py-1.5 pl-2 pr-3 text-[14px] font-semibold text-ink"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf font-display text-[13px] font-bold text-white">
          {initials(customer.name)}
        </span>
        {firstName}
        <ChevronDown
          className={`h-3 w-3 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-[calc(100%+10px)] z-[100] w-60 rounded-2xl border border-line bg-paper p-2 shadow-pop">
            <div className="mb-1.5 border-b border-line px-3 pb-3 pt-2">
              <strong className="block font-display text-[15px] text-ink">
                {customer.name}
              </strong>
              <span className="text-[12.5px] text-ink-soft">
                {customer.email}
              </span>
            </div>
            <Link
              href="/account/orders"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14.5px] font-semibold text-ink hover:bg-[rgba(90,138,74,.12)]"
            >
              My orders
            </Link>
            <Link
              href="/track"
              onClick={() => setOpen(false)}
              className="mb-1.5 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14.5px] font-semibold text-ink hover:bg-[rgba(90,138,74,.12)]"
            >
              Track an order
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[14.5px] font-semibold text-apple hover:bg-apple/10"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Mobile-drawer account block: Log in link, or name + Log out when signed in. */
function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const { customer, signOut } = useAuth();

  if (!customer) {
    return (
      <div className="rounded-xl border border-line bg-paper p-3">
        <Link
          href="/login"
          onClick={onNavigate}
          className="block rounded-lg bg-leaf py-2.5 text-center text-[14px] font-semibold text-white"
        >
          Log in
        </Link>
        <Link
          href="/track"
          onClick={onNavigate}
          className="mt-2 block py-1.5 text-center text-[13.5px] font-semibold text-ink-soft"
        >
          Track an order
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf font-display text-[13px] font-bold text-white">
          {initials(customer.name)}
        </span>
        <span className="min-w-0">
          <strong className="block truncate font-display text-[15px] text-ink">
            {customer.name}
          </strong>
          <span className="block truncate text-[12.5px] text-ink-soft">
            {customer.email}
          </span>
        </span>
      </div>
      <Link
        href="/account/orders"
        onClick={onNavigate}
        className="mt-3 block rounded-lg border border-line py-2.5 text-center text-[14px] font-semibold text-ink"
      >
        My orders
      </Link>
      <button
        type="button"
        onClick={() => {
          void signOut();
          onNavigate();
        }}
        className="mt-2 w-full rounded-lg border border-line py-2.5 text-[14px] font-semibold text-apple"
      >
        Log out
      </button>
    </div>
  );
}

const primaryLinks = [
  { href: "/#process", label: "How it's made" },
  { href: "/subscribe", label: "Plans" },
  { href: "/#benefits", label: "Why cold-pressed" },
  { href: "/stores", label: "Find a store" },
];

// Product-browsing destinations grouped under the "Shop" mega-menu. Each column
// gets a section label and a uniform stack of items (label + description), so
// both sides of the panel read the same way. Drives the desktop and mobile menus.
const shopMenu = [
  {
    heading: "Seasonal",
    items: [
      {
        href: "/seasonal",
        label: "Seasonal picks",
        desc: "At their seasonal best",
      },
      {
        href: "/seasonal#fruits",
        label: "Fruits",
        desc: "Fresh fruit favourites",
      },
      {
        href: "/seasonal#vegetables",
        label: "Vegetables",
        desc: "Roots & leafy greens",
      },
    ],
  },
  {
    heading: "Juices & bundles",
    items: [
      {
        href: "/products",
        label: "Our juices",
        desc: "Freshly cold-pressed",
      },
      {
        href: "/#arrivals",
        label: "New arrivals",
        desc: "Fresh additions to the menu",
      },
      { href: "/combos", label: "Combos", desc: "Curated juice boxes" },
    ],
  },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const shopRoot = useRef<HTMLDivElement>(null);
  const shopButton = useRef<HTMLButtonElement>(null);
  const shopPanel = useRef<HTMLDivElement>(null);
  const shopPanelId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setShopOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!shopOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!shopRoot.current?.contains(event.target as Node)) setShopOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [shopOpen]);
  // On the auth screens, shopping controls (the cart) are out of place.
  const isAuthPage = pathname?.startsWith("/login") ?? false;

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-line">
      <div className="max-w-wrap mx-auto px-4 sm:px-8 flex items-center justify-between h-[78px] gap-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="GlowRoot home"
          >
            <Image
              src="/assets/glowroot-logo-trim.png"
              alt="GlowRoot"
              width={140}
              height={50}
              className="theme-logo h-[40px] sm:h-[50px] w-auto max-w-[100px] sm:max-w-[140px] object-contain"
              priority
            />
          </Link>
          <BrandFilm variant="badge" />
        </div>

        {/* desktop nav — hidden on the auth screens */}
        {!isAuthPage && (
          <nav className="hidden xl:flex gap-6 items-center">
            {/* Shop mega-menu — Seasonal, Our juices, New & Combos in one place */}
            <div
              ref={shopRoot}
              className="relative flex items-center"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => {
                if (!shopPanel.current?.contains(document.activeElement))
                  setShopOpen(false);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setShopOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  shopButton.current?.focus();
                  setShopOpen(false);
                }
              }}
            >
              <button
                ref={shopButton}
                type="button"
                className={`text-[15px] font-medium ${shopOpen ? "text-leaf" : "text-ink-soft"} inline-flex items-center gap-1.5 transition-colors focus-visible:outline-leaf focus-visible:outline-offset-4`}
                aria-expanded={shopOpen}
                aria-controls={shopPanelId}
                onClick={(event) =>
                  setShopOpen((open) => (event.detail === 0 ? !open : true))
                }
              >
                Shop
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${shopOpen ? "rotate-180" : ""} motion-reduce:transition-none`}
                />
              </button>
              {shopOpen && (
                <div
                  ref={shopPanel}
                  id={shopPanelId}
                  className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 grid grid-cols-2 divide-x divide-leaf/10 w-[580px] rounded-3xl border border-line bg-paper p-5 shadow-[0_18px_48px_-20px_rgba(35,70,46,.3)] before:content-[''] before:absolute before:-top-4 before:inset-x-0 before:h-4"
                >
                  {shopMenu.map((col) => (
                    <div
                      key={col.heading}
                      className="flex flex-col gap-1.5 px-4 first:pl-0 last:pr-0"
                    >
                      <span className="px-3 pt-1 pb-2 font-body text-[13px] leading-5 font-semibold tracking-[.02em] text-leaf">
                        {col.heading}
                      </span>
                      {col.items.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setShopOpen(false)}
                          className="group/item block rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-leaf/[.07] focus-visible:bg-leaf/[.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf/40 motion-reduce:transition-none"
                        >
                          <span className="flex items-center justify-between gap-2 text-[15px] font-semibold text-ink group-hover/item:text-leaf group-focus-visible/item:text-leaf">
                            {l.label}
                            <svg
                              aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0 -translate-x-1 text-leaf opacity-0 transition-[opacity,transform] duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-100 group-focus-visible/item:translate-x-0 group-focus-visible/item:opacity-100 motion-reduce:transition-none"
                            >
                              <path d="M5 12h14m-6-6 6 6-6 6" />
                            </svg>
                          </span>
                          <span className="mt-1 block text-[12px] leading-relaxed text-ink-soft">
                            {l.desc}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {primaryLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[15px] font-medium text-ink-soft hover:text-leaf transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {/* right cluster */}
        <div className="hidden xl:flex items-center gap-3.5">
          <ThemeToggle compact />
          <PincodeControl autoOpen />
          {!isAuthPage && <CartButton />}
          <AccountControl />
        </div>

        {/* mobile controls */}
        <div className="flex xl:hidden items-center gap-2">
          <ThemeToggle compact />
          {!isAuthPage && <CartButton />}
          <button
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="w-[46px] h-[46px] border border-line bg-paper rounded-[13px] flex flex-col items-center justify-center gap-[5px]"
          >
            <span className="block w-5 h-0.5 bg-ink rounded" />
            <span className="block w-5 h-0.5 bg-ink rounded" />
            <span className="block w-5 h-0.5 bg-ink rounded" />
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      <div
        className={`fixed inset-0 z-[150] bg-[rgba(25,40,18,.42)] transition-opacity duration-300 xl:hidden ${
          mobileOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 z-[200] w-[min(360px,86vw)] bg-cream p-6 flex flex-col overflow-y-auto shadow-[-24px_0_60px_-24px_rgba(25,40,18,.45)] transition-transform duration-300 xl:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex justify-between items-center mb-4">
          <Image
            src="/assets/glowroot-logo-trim.png"
            alt="GlowRoot"
            width={130}
            height={46}
            className="theme-logo h-[46px] w-auto"
          />
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="w-[42px] h-[42px] border border-line bg-paper rounded-xl text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="mb-4">
          <PincodeControl />
        </div>
        <div className="mb-4">
          <MobileAccount onNavigate={() => setMobileOpen(false)} />
        </div>
        <nav className="flex flex-col border-t border-line">
          {shopMenu.map((col) => (
            <div key={col.heading}>
              <div className="pt-4 pb-1.5 font-display text-[12px] font-bold tracking-[.07em] uppercase text-ink-soft">
                {col.heading}
              </div>
              {col.items.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-[15px] border-b border-line font-body text-[15px] font-medium text-ink-soft pl-4 hover:text-leaf"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
          {primaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="py-[15px] border-b border-line font-display text-[19px] font-semibold text-ink hover:text-leaf"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
    </header>
  );
}
