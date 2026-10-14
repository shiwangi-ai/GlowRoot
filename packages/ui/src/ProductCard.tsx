import type { ReactNode } from "react";
import Image from "next/image";
import type { Product } from "@glowroot/types";
import { formatINR, joinIngredients } from "@glowroot/utils";
import { cn } from "./cn";

/**
 * The juice/product card (`.juice` in the prototype). Presentational — pass a
 * client `footer` (e.g. an Add-to-cart button) when interactivity is needed.
 */
export function ProductCard({
  product,
  footer,
  className,
  hidePrice = false,
  hideDescription = false,
}: {
  product: Product;
  footer?: ReactNode;
  className?: string;
  /** Combo/box pages sell at one flat box price, so hide the per-bottle price
   *  but keep the bottle size. */
  hidePrice?: boolean;
  /** Combo/box pages keep the cards compact — name + ingredients only. */
  hideDescription?: boolean;
}) {
  return (
    <article
      className={cn(
        "bg-paper rounded-3xl overflow-hidden flex flex-col",
        "transition-all duration-200 hover:-translate-y-1.5 hover:shadow-card",
        className,
      )}
    >
      <div className="relative w-full aspect-[11/6] bg-cream-2">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 900px) 80vw, 380px"
          className="object-cover"
        />
      </div>
      <div className="p-6 pt-6 flex flex-col gap-2 flex-1">
        <div className="flex justify-between items-baseline gap-3">
          <h3 className="font-display font-bold text-[23px] leading-[1.04] tracking-[-0.02em] text-ink">
            {product.name}
          </h3>
          <span className="flex flex-col items-end shrink-0">
            {hidePrice ? null : (
              <span className="font-display text-xl font-bold text-leaf whitespace-nowrap">
                {formatINR(product.priceINR)}
              </span>
            )}
            <span className="text-[12px] text-ink-soft whitespace-nowrap">
              {product.volumeMl} ml
            </span>
          </span>
        </div>
        <p className="text-[12.5px] text-leaf-soft font-semibold tracking-[.02em]">
          {joinIngredients(product.ingredients)}
        </p>
        {hideDescription ? null : (
          <p className="text-[14.5px] text-ink-soft">{product.description}</p>
        )}
        {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
      </div>
    </article>
  );
}
