"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatINR } from "@glowroot/utils";
import { ChevronRight } from "@glowroot/ui";
import { useStore } from "./StoreProvider";
import { isOrderPage } from "@/lib/order-routes";

/** Small bag glyph, matching the header cart button's line style. */
function BagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
      <path d="M6 6 5 2H2" strokeLinecap="round" />
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="18" cy="20" r="1.6" />
    </svg>
  );
}

/**
 * Floating cart bar pinned to the bottom-right — the fly-to-cart target.
 * Ported from the juice-shop demo's `.cart-island`, restyled to the
 * GlowRoot palette and wired to the shared cart store.
 */
export function CartIsland() {
  const { items, count, subtotalINR, setQty, openCart, cartPing } = useStore();
  const pathname = usePathname();

  // Spring the whole bar whenever the item count goes up (the "cart bump").
  const [bump, setBump] = useState(false);
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 450);
      prevCount.current = count;
      return () => window.clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  // Shake the bar whenever the header cart button pings it. Skips the very
  // first render (cartPing starts at 0) so it only fires on real clicks.
  const [shake, setShake] = useState(false);
  const firstPing = useRef(true);
  useEffect(() => {
    if (firstPing.current) {
      firstPing.current = false;
      return;
    }
    setShake(true);
    const t = window.setTimeout(() => setShake(false), 500);
    return () => window.clearTimeout(t);
  }, [cartPing]);

  // Tapping the bar opens the full cart drawer. Clicks that land on the inner
  // controls (qty steppers, Checkout link) are left alone.
  const handleBarClick = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    openCart();
  };

  // The checkout flow IS the cart — hide the floating bar there. Also hide it on
  // auth and order-management screens, and on the combo-menu builder, which
  // shows its own combo-specific cart bar in the same corner.
  if (
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/combos/menu") ||
    isOrderPage(pathname)
  ) {
    return null;
  }

  return (
    <aside
      id="cart-anchor"
      aria-label="Shopping cart"
      role="button"
      tabIndex={0}
      onClick={handleBarClick}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          handleBarClick(e as unknown as React.MouseEvent<HTMLElement>);
        }
      }}
      className={`fixed right-5 bottom-5 z-40 w-[min(30rem,calc(100vw-2.5rem))] cursor-pointer rounded-[2rem] bg-leaf text-white p-3 shadow-[0_18px_50px_-12px_rgba(25,40,18,.5)] max-sm:right-3 max-sm:left-3 max-sm:bottom-3 max-sm:w-auto ${
        bump ? "cart-bump" : ""
      } ${shake ? "cart-shake" : ""}`}
    >
      {count === 0 ? (
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="flex w-12 h-12 items-center justify-center rounded-full bg-white/10">
            <BagIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-bold">Your basket is empty</p>
            <p className="text-xs text-white/65">
              Add a fresh pressing to begin
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="mr-1 flex w-10 h-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <BagIcon className="w-4 h-4" />
              </span>
              <div className="flex -space-x-3">
                {items.slice(0, 4).map(({ product }) => (
                  <div
                    key={product.slug}
                    className="relative w-11 h-11 overflow-hidden rounded-full border-2 border-leaf bg-cream"
                  >
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-sm font-bold">
                  {count} {count === 1 ? "bottle" : "bottles"}
                </p>
                <p className="text-xs text-white/65">Ready to press</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatINR(subtotalINR)}</p>
              <p className="text-[11px] text-white/65">incl. taxes</p>
            </div>
          </div>

          <div
            data-cart-details
            className="max-h-28 overflow-y-auto rounded-2xl bg-white/10 p-2"
          >
            {items.map(({ product, qty }) => (
              <div
                key={product.slug}
                className="flex items-center gap-2 px-1 py-1.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {product.name}
                </span>
                <button
                  type="button"
                  aria-label={`Remove one ${product.name}`}
                  onClick={() => setQty(product.slug, qty - 1)}
                  className="flex w-6 h-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                  −
                </button>
                <span className="w-4 text-center font-bold">{qty}</span>
                <button
                  type="button"
                  aria-label={`Add one ${product.name}`}
                  onClick={() => setQty(product.slug, qty + 1)}
                  className="flex w-6 h-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                  +
                </button>
              </div>
            ))}
          </div>

          <Link
            data-cart-details
            href="/checkout"
            className="flex w-full items-center justify-between rounded-full bg-carrot px-5 py-3 font-bold text-white transition-transform active:scale-[0.98]"
          >
            Checkout <ChevronRight className="w-5 h-5 shrink-0" />
          </Link>
        </div>
      )}
    </aside>
  );
}
