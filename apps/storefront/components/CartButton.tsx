"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "./StoreProvider";
import { isOrderPage } from "@/lib/order-routes";

/** Header cart button showing the live item count; opens the cart drawer. */
export function CartButton() {
  const { count, pingCart } = useStore();
  const pathname = usePathname();

  // A quick springy pop on click, so the tap feels physical — and a ping that
  // makes the always-visible floating cart bar shake to draw the eye there.
  const [pop, setPop] = useState(false);
  const handleClick = () => {
    setPop(true);
    window.setTimeout(() => setPop(false), 360);
    pingCart();
  };

  // This button points to the floating cart, which is hidden on order pages.
  if (isOrderPage(pathname)) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Open cart (${count} items)`}
      className={`relative inline-flex items-center justify-center w-[46px] h-[46px] rounded-[13px] border border-line bg-paper hover:border-leaf transition-colors ${
        pop ? "cart-pop" : ""
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
      >
        <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
        <path d="M6 6 5 2H2" strokeLinecap="round" />
        <circle cx="9" cy="20" r="1.6" />
        <circle cx="18" cy="20" r="1.6" />
      </svg>
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-carrot text-white text-[11px] font-bold grid place-items-center">
          {count}
        </span>
      ) : null}
    </button>
  );
}
