"use client";

import Image from "next/image";
import Link from "next/link";
import { formatINR } from "@glowroot/utils";
import { Button } from "@glowroot/ui";
import { useStore } from "./StoreProvider";

/** Centered cart popup. Add-to-cart is allowed regardless of pincode. */
export function CartDrawer() {
  const { items, cartOpen, closeCart, setQty, removeItem, subtotalINR, count } =
    useStore();

  return (
    <>
      <div
        className={`fixed inset-0 z-[150] bg-[rgba(25,40,18,.42)] backdrop-blur-[2px] transition-opacity duration-300 ${
          cartOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeCart}
        aria-hidden
      />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Your cart"
          className={`w-[min(440px,92vw)] max-h-[85vh] bg-cream rounded-3xl overflow-hidden shadow-[0_30px_80px_-24px_rgba(25,40,18,.55)] flex flex-col transition-all duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] ${
            cartOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-90 pointer-events-none"
          }`}
          aria-hidden={!cartOpen}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-line">
            <h2 className="font-display text-xl font-bold">
              Your cart{" "}
              {count > 0 ? (
                <span className="text-ink-soft">· {count}</span>
              ) : null}
            </h2>
            <button
              onClick={closeCart}
              aria-label="Close cart"
              className="w-[42px] h-[42px] rounded-xl border border-line bg-paper text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <p className="text-ink-soft text-[15px] mt-6">
                Your cart is empty. Browse our juices and add a few pressings.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {items.map(({ product, qty, contents }) => (
                  <li key={product.slug} className="flex gap-3 items-center">
                    <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-cream-2 border border-line">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <span className="font-display font-bold text-[15px] truncate">
                          {product.name}
                        </span>
                        <span className="text-leaf font-semibold text-[14px] whitespace-nowrap">
                          {formatINR(product.priceINR * qty)}
                        </span>
                      </div>
                      {contents && contents.length > 0 ? (
                        <p className="text-[12px] leading-snug text-ink-soft mt-0.5">
                          {contents
                            .map((c) => `${c.qty}× ${c.name}`)
                            .join(" · ")}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="inline-flex items-center rounded-full border border-line bg-paper">
                          <button
                            onClick={() => setQty(product.slug, qty - 1)}
                            className="w-7 h-7 grid place-items-center text-ink-soft hover:text-leaf"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-[14px] font-semibold">
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(product.slug, qty + 1)}
                            className="w-7 h-7 grid place-items-center text-ink-soft hover:text-leaf"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(product.slug)}
                          className="text-[12.5px] text-ink-soft hover:text-carrot underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-6 py-5">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-ink-soft">Subtotal</span>
              <span className="font-display text-2xl font-extrabold text-leaf">
                {formatINR(subtotalINR)}
              </span>
            </div>
            <Button
              href="/checkout"
              variant="primary"
              className="w-full"
              onClick={
                items.length === 0 ? (e) => e.preventDefault() : closeCart
              }
              aria-disabled={items.length === 0}
            >
              Checkout
            </Button>
            <p className="text-[12px] text-ink-soft text-center mt-3">
              Pincode &amp; delivery date confirmed at checkout.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
