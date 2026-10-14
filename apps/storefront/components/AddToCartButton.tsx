"use client";

import type { BoxContent, Product } from "@glowroot/types";
import { Button, ArrowRight } from "@glowroot/ui";
import type { ButtonVariant } from "@glowroot/ui";
import { useStore } from "./StoreProvider";

/** Client add-to-cart trigger usable inside server-rendered cards/pages. */
export function AddToCartButton({
  product,
  qty = 1,
  contents,
  variant = "primary",
  label = "Add to Cart",
  withArrow = false,
  className,
}: {
  product: Product;
  qty?: number;
  contents?: BoxContent[];
  variant?: ButtonVariant;
  label?: string;
  withArrow?: boolean;
  className?: string;
}) {
  const { addItem, flyToCart } = useStore();

  function handleClick() {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !product.imageUrl) {
      addItem(product, qty, contents);
      return;
    }

    // Fly the bubble now; add the item once it lands (750ms) so the
    // cart bump fires exactly when the bubble arrives — same as the demo.
    flyToCart(product.imageUrl);
    window.setTimeout(() => addItem(product, qty, contents), 750);
  }

  return (
    <Button variant={variant} onClick={handleClick} className={className}>
      {label}
      {withArrow ? <ArrowRight /> : null}
    </Button>
  );
}
