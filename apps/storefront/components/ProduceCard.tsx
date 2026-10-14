"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Produce, Product } from "@glowroot/types";
import { formatINR } from "@glowroot/utils";
import { useStore } from "./StoreProvider";
import { SeasonalPress } from "./SeasonalPress";

/** Keep the harvest photography; turn it into the finished juice on demand. */
export function ProduceCard({
  item,
  product,
}: {
  item: Produce;
  product: Product;
}) {
  const { addItem, flyToCart } = useStore();
  const [pressing, setPressing] = useState(false);
  const busy = useRef(false);

  function startPress() {
    if (busy.current) return;
    busy.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      addItem(product, 1);
      busy.current = false;
      return;
    }
    setPressing(true);
  }

  function finishPress() {
    if (!busy.current) return;
    busy.current = false;
    setPressing(false);
    flyToCart(product.imageUrl);
    addItem(product, 1);
  }

  return (
    <>
      <button
        type="button"
        onClick={startPress}
        aria-label={`Press and add ${product.name} to cart, ${formatINR(product.priceINR)}, ${product.volumeMl} ml`}
        aria-busy={pressing}
        className="seasonal-card text-center group cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2"
      >
        <span
          className="relative w-full aspect-square rounded-full grid place-items-center mb-[18px] transition-transform duration-300 motion-safe:group-hover:-translate-y-1.5"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${item.ring.from}, ${item.ring.to})`,
          }}
        >
          <span className="relative w-[84%] h-[84%] rounded-full overflow-hidden">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 42vw, 260px"
              quality={90}
              className="object-cover"
            />
          </span>
          <span className="seasonal-card-cta">
            <svg
              width="16"
              height="20"
              viewBox="0 0 24 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M8 3h8v5l4 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V13l4-5V3ZM8 1h8M5 18h14" />
            </svg>
            Press &amp; add
          </span>
        </span>
        <span className="block font-display font-bold text-[21px]">
          {item.name}
        </span>
        <span className="block text-[13.5px] text-ink-soft mt-1.5 px-1.5">
          {item.note}
        </span>
        <span className="block text-[13px] text-leaf font-semibold mt-2">
          {formatINR(product.priceINR)}{" "}
          <span className="font-normal text-ink-soft">
            / {product.volumeMl} ml bottle
          </span>
        </span>
        <span className="inline-block text-[11px] font-semibold tracking-[.08em] uppercase text-leaf bg-[rgba(90,138,74,.14)] px-2.5 py-[3px] rounded-full mt-2.5">
          {item.tag}
        </span>
      </button>
      {pressing ? (
        <SeasonalPress
          item={item}
          product={product}
          onComplete={finishPress}
          onCancel={() => {
            busy.current = false;
            setPressing(false);
          }}
        />
      ) : null}
    </>
  );
}
