"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@glowroot/types";
import { ProductCard, ChevronLeft, ChevronRight } from "@glowroot/ui";
import { ProductCardActions } from "./ProductCardActions";

const GAP = 28;

/** Scroll-snap juice carousel — a React port of the prototype's vanilla JS. */
export function ProductCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const metrics = useCallback(() => {
    const track = trackRef.current;
    const first = track?.querySelector<HTMLElement>("[data-card]");
    if (!track || !first) return { step: 1, perView: 1 };
    const cardW = first.getBoundingClientRect().width;
    const step = cardW + GAP;
    const perView = Math.max(1, Math.round((track.clientWidth + GAP) / step));
    return { step, perView };
  }, []);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { step, perView } = metrics();
    const max = track.scrollWidth - track.clientWidth - 2;
    setAtStart(track.scrollLeft <= 2);
    setAtEnd(track.scrollLeft >= max);
    setActive(Math.round(track.scrollLeft / step));
    setPages(Math.max(1, products.length - perView + 1));
  }, [metrics, products.length]);

  useEffect(() => {
    update();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * metrics().step, behavior: "smooth" });
  };

  const goTo = (idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: idx * metrics().step, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        aria-label="Previous juices"
        onClick={() => scrollBy(-1)}
        disabled={atStart}
        className="hidden md:grid absolute top-[38%] left-[-22px] w-12 h-12 rounded-full bg-paper border border-line place-items-center z-[5] shadow-[0_14px_30px_-14px_rgba(40,55,25,.5)] transition-all hover:bg-leaf hover:scale-105 disabled:opacity-30 disabled:pointer-events-none [&:hover_svg]:stroke-white"
      >
        <ChevronLeft className="w-5 h-5 stroke-ink" />
      </button>
      <button
        aria-label="Next juices"
        onClick={() => scrollBy(1)}
        disabled={atEnd}
        className="hidden md:grid absolute top-[38%] right-[-22px] w-12 h-12 rounded-full bg-paper border border-line place-items-center z-[5] shadow-[0_14px_30px_-14px_rgba(40,55,25,.5)] transition-all hover:bg-leaf hover:scale-105 disabled:opacity-30 disabled:pointer-events-none [&:hover_svg]:stroke-white"
      >
        <ChevronRight className="w-5 h-5 stroke-ink" />
      </button>

      <div
        ref={trackRef}
        className="flex gap-7 overflow-x-auto snap-x snap-mandatory py-1.5 pb-[22px] -mx-1 px-1 no-scrollbar scroll-smooth"
      >
        {products.map((p) => (
          <div
            key={p.slug}
            data-card
            className="snap-start shrink-0 w-[78%] md:w-[calc((100%-56px)/3)]"
          >
            <ProductCard
              product={p}
              footer={<ProductCardActions product={p} />}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2.5 mt-2">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-[9px] rounded-full transition-all ${
              i === active ? "w-[26px] bg-carrot" : "w-[9px] bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
