import type { Product } from "@glowroot/types";
import { AddToCartButton } from "./AddToCartButton";
import { ProductDetailsButton } from "./ProductQuickView";

export function ProductCardActions({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-2">
      <AddToCartButton product={product} className="flex-1" />
      <ProductDetailsButton product={product} />
    </div>
  );
}
