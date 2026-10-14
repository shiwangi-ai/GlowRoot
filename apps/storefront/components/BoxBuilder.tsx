"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { BoxContent, Bundle, Product } from "@glowroot/types";
import { Button, ArrowRight } from "@glowroot/ui";
import { BOTTLE_ML } from "@glowroot/utils";
import { useStore } from "./StoreProvider";

/**
 * Pick-your-juices flow for a one-time box (Sampler / Sharing).
 * Box price is flat per box ("mix any N you like"); the customer just chooses
 * which juices fill the fixed N slots. The chosen juices are baked into a
 * config-unique synthetic product so the cart and checkout can show them, and
 * carried as structured `contents` so the saved order keeps the breakdown.
 */
export function BoxBuilder({
  bundle,
  juices,
}: {
  bundle: Bundle;
  juices: Product[];
}) {
  const { addItem, flyToCart } = useStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  const chosen = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts],
  );
  const remaining = bundle.quantity - chosen;
  const full = remaining === 0;

  const setCount = (slug: string, next: number) =>
    setCounts((prev) => {
      const clamped = Math.max(0, next);
      if (clamped === 0) {
        const { [slug]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [slug]: clamped };
    });

  function addBox() {
    if (!full) return;

    const contents: BoxContent[] = juices
      .map((j) => ({
        productSlug: j.slug,
        name: j.name,
        qty: counts[j.slug] ?? 0,
      }))
      .filter((c) => c.qty > 0);

    // A config-unique slug: same fill merges in the cart, a different fill
    // becomes its own line. Sorted so slot order never changes the identity.
    const fingerprint = [...contents]
      .sort((a, b) => a.productSlug.localeCompare(b.productSlug))
      .map((c) => `${c.productSlug}-${c.qty}`)
      .join("_");

    const detail = contents.map((c) => `${c.qty}× ${c.name}`).join(" · ");

    const boxProduct: Product = {
      slug: `${bundle.slug}::${fingerprint}`,
      name: bundle.name,
      kind: "juice",
      priceINR: bundle.priceINR,
      volumeMl: BOTTLE_ML * bundle.quantity,
      ingredients: [],
      description: detail,
      imageUrl: "/assets/combo-trio.png",
      tags: ["Bundle"],
      recipe: [],
    };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      addItem(boxProduct, 1, contents);
    } else {
      flyToCart(boxProduct.imageUrl);
      window.setTimeout(() => addItem(boxProduct, 1, contents), 750);
    }

    setCounts({});
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* live counter */}
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <span className="text-[13px] font-semibold text-ink">
          Fill your box
        </span>
        <span
          className={`text-[14px] font-semibold ${
            full ? "text-leaf" : "text-ink-soft"
          }`}
        >
          {chosen} of {bundle.quantity} bottles
          {full ? " · ready" : ` · ${remaining} to go`}
        </span>
      </div>

      {/* juice list with steppers */}
      <ul className="flex flex-col gap-3">
        {juices.map((juice) => {
          const qty = counts[juice.slug] ?? 0;
          const canAdd = !full;
          return (
            <li
              key={juice.slug}
              className="flex items-center gap-3 rounded-2xl border border-line bg-cream px-3 py-2.5"
            >
              <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-cream-2 border border-line">
                <Image
                  src={juice.imageUrl}
                  alt={juice.name}
                  fill
                  sizes="44px"
                  className="object-contain p-1"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[15px] truncate">
                  {juice.name}
                </div>
                <div className="text-[12px] text-ink-soft truncate">
                  {juice.ingredients.slice(0, 3).join(" · ")}
                </div>
              </div>
              <div className="inline-flex items-center rounded-full border border-line bg-paper shrink-0">
                <button
                  type="button"
                  onClick={() => setCount(juice.slug, qty - 1)}
                  disabled={qty === 0}
                  aria-label={`Remove one ${juice.name}`}
                  className="w-8 h-8 grid place-items-center text-ink-soft hover:text-leaf disabled:opacity-30 disabled:hover:text-ink-soft"
                >
                  −
                </button>
                <span className="w-6 text-center text-[14px] font-semibold">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setCount(juice.slug, qty + 1)}
                  disabled={!canAdd}
                  aria-label={`Add one ${juice.name}`}
                  className="w-8 h-8 grid place-items-center text-ink-soft hover:text-leaf disabled:opacity-30 disabled:hover:text-ink-soft"
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        variant="primary"
        className="w-full mt-1"
        onClick={addBox}
        disabled={!full}
      >
        {full
          ? bundle.ctaLabel
          : `Choose ${remaining} more ${remaining === 1 ? "bottle" : "bottles"}`}
        {full ? <ArrowRight /> : null}
      </Button>

      {added ? (
        <p className="text-[13px] text-leaf text-center">
          Box added to your order — build another or head to checkout.
        </p>
      ) : (
        <p className="text-[12px] text-ink-soft text-center">
          Any mix of {bundle.quantity} × {BOTTLE_ML} ml bottles — same flat box
          price.
        </p>
      )}
    </div>
  );
}
