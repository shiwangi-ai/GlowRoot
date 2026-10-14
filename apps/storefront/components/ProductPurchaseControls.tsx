"use client";

import { useState } from "react";
import type { Product } from "@glowroot/types";
import { formatINR } from "@glowroot/utils";
import { AddToCartButton } from "./AddToCartButton";

export function ProductPurchaseControls({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-display text-3xl font-bold text-leaf">
            {formatINR(product.priceINR)}
          </span>
          <p className="text-sm text-ink-soft">
            per {product.volumeMl} ml bottle
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-soft">Quantity</p>
          <div
            className="inline-flex items-center rounded-full border border-line bg-paper"
            role="group"
            aria-label={`Quantity for ${product.name}`}
          >
            <button
              type="button"
              aria-label={`Decrease quantity of ${product.name}`}
              disabled={quantity === 1}
              onClick={() => setQuantity((value) => value - 1)}
              className="h-11 w-11 rounded-full text-xl hover:bg-leaf/10 disabled:opacity-30 focus-visible:outline-leaf"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase quantity of ${product.name}`}
              disabled={quantity === 20}
              onClick={() => setQuantity((value) => value + 1)}
              className="h-11 w-11 rounded-full text-xl hover:bg-leaf/10 disabled:opacity-30 focus-visible:outline-leaf"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <AddToCartButton
        product={product}
        qty={quantity}
        label={`Add to cart · ${formatINR(product.priceINR * quantity)}`}
        withArrow
        className="mt-4 w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
      />
    </div>
  );
}
