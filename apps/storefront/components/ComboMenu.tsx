"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { BoxContent, Bundle, Product } from "@glowroot/types";
import { Eyebrow, ChevronRight, ProductCard } from "@glowroot/ui";
import { BOTTLE_ML, formatINR } from "@glowroot/utils";
import { useStore } from "./StoreProvider";
import { juiceColor } from "@/lib/juiceColors";

/**
 * The combo-plan builder page. The customer picks a box size (Sampler · 3 or
 * Sharing · 6), then fills it from the price-free juice menu. Each juice is a
 * one-of, so picks are a set of slugs capped at the box size. The assembled box
 * commits to the real cart as a single line item (with structured `contents`)
 * at checkout — mirroring the BoxBuilder flow.
 */
export function ComboMenu({
  bundles,
  juices,
  initialBundleSlug,
}: {
  bundles: Bundle[];
  juices: Product[];
  initialBundleSlug?: string;
}) {
  const { addItem, flyToCart } = useStore();
  const router = useRouter();

  const [bundleSlug, setBundleSlug] = useState(
    initialBundleSlug || bundles[0]?.slug || "",
  );
  const [picks, setPicks] = useState<string[]>([]); // ordered, unique juice slugs
  const [bump, setBump] = useState(false); // spring the cart bar when a juice lands

  const bySlug = useMemo(
    () => new Map(juices.map((j) => [j.slug, j])),
    [juices],
  );

  const bundle = bundles.find((b) => b.slug === bundleSlug) ?? bundles[0];
  const size = bundle?.quantity ?? 0;
  const remaining = size - picks.length;
  const full = remaining === 0;

  function selectBundle(slug: string) {
    const next = bundles.find((b) => b.slug === slug);
    if (!next) return;
    setBundleSlug(slug);
    setPicks((prev) => prev.slice(0, next.quantity)); // trim if the new box is smaller
  }

  // Add a juice — the frame it lands in springs the whole bar (see bump effect).
  // Mirror the main cart: fly a bubble to the corner, then drop the pick in when
  // it lands (750ms) so the frame fills exactly as the bubble arrives.
  function addJuice(slug: string) {
    if (picks.includes(slug) || picks.length >= size) return;
    const juice = bySlug.get(slug);
    const commit = () =>
      setPicks((prev) =>
        prev.includes(slug) || prev.length >= size ? prev : [...prev, slug],
      );

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !juice?.imageUrl) {
      commit();
      return;
    }
    flyToCart(juice.imageUrl);
    window.setTimeout(commit, 750);
  }

  // Spring the cart bar whenever a juice lands in a frame — the "bounce".
  const prevCount = useRef(picks.length);
  useEffect(() => {
    if (picks.length > prevCount.current) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 480);
      prevCount.current = picks.length;
      return () => window.clearTimeout(t);
    }
    prevCount.current = picks.length;
  }, [picks.length]);

  if (!bundle) return null;

  function removeJuice(slug: string) {
    setPicks((prev) => prev.filter((s) => s !== slug));
  }

  function checkout() {
    if (!full || !bundle) return;
    const chosen = picks
      .map((slug) => bySlug.get(slug))
      .filter((j): j is Product => Boolean(j));

    const contents: BoxContent[] = chosen.map((j) => ({
      productSlug: j.slug,
      name: j.name,
      qty: 1,
    }));

    // Config-unique slug so an identical fill merges in the cart, a different
    // fill stays its own line. Sorted so slot order never changes identity.
    const fingerprint = [...contents]
      .sort((a, b) => a.productSlug.localeCompare(b.productSlug))
      .map((c) => `${c.productSlug}-${c.qty}`)
      .join("_");

    const boxProduct: Product = {
      slug: `${bundle.slug}::${fingerprint}`,
      name: bundle.name,
      kind: "juice",
      priceINR: bundle.priceINR,
      volumeMl: BOTTLE_ML * bundle.quantity,
      ingredients: [],
      description: contents.map((c) => `${c.qty}× ${c.name}`).join(" · "),
      imageUrl: "/assets/combo-trio.png",
      tags: ["Combo"],
      recipe: [],
    };

    addItem(boxProduct, 1, contents);
    router.push("/checkout");
  }

  return (
    <>
      {/* ---- header ---- */}
      <header className="mt-6 mb-9">
        <Eyebrow>Combos &amp; gifting · one-time</Eyebrow>
        <h1 className="text-[clamp(30px,4vw,46px)] mt-3">
          Build a box,{" "}
          <span className="script text-[1.1em]">fill it with colour</span>
        </h1>
        <p className="text-[16px] text-ink-soft mt-3 max-w-[560px]">
          Pick a box size, then add any cold-pressed juices you like — one flat
          price, no per-bottle maths. We press them the morning of delivery.
        </p>
      </header>

      {/* ---- step 1 · choose a box ---- */}
      <StepHead n={1} title="Choose your box" hint="Same juices, two sizes" />
      <div className="flex gap-3 flex-wrap mb-10">
        {bundles.map((b) => {
          const active = b.slug === bundle.slug;
          return (
            <button
              key={b.slug}
              type="button"
              onClick={() => selectBundle(b.slug)}
              aria-pressed={active}
              className={`flex-1 min-w-[250px] flex items-center gap-4 text-left bg-paper border-[1.5px] rounded-2xl p-4 transition-all hover:-translate-y-0.5 ${
                active ? "border-leaf bg-[rgba(90,138,74,.08)]" : "border-line"
              }`}
            >
              <span
                className={`w-5 h-5 shrink-0 rounded-full border-2 grid place-items-center ${
                  active ? "border-leaf" : "border-line"
                }`}
              >
                {active ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-leaf" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block font-display font-bold text-[17px]">
                  {b.name}
                </span>
                <span className="block text-[12.5px] text-ink-soft mt-0.5">
                  {b.quantity} × {BOTTLE_ML} ml bottles · fill with any juices
                </span>
              </span>
              {b.pickLabel ? (
                <span className="ml-auto shrink-0 text-[11px] font-bold uppercase tracking-[.05em] text-leaf bg-[rgba(90,138,74,.14)] px-2.5 py-1 rounded-full">
                  {b.pickLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ---- step 2 · add juices (no prices, A→Z) ---- */}
      <StepHead
        n={2}
        title="Add your juices"
        hint="Just pick your favourites"
      />
      <ul className="grid gap-7 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {juices.map((juice) => {
          const added = picks.includes(juice.slug);
          return (
            <li key={juice.slug} className="relative">
              {added ? (
                <span className="absolute top-3.5 right-3.5 z-[2] w-7 h-7 rounded-full bg-leaf text-white grid place-items-center text-[15px] font-extrabold shadow-[0_4px_10px_-3px_rgba(0,0,0,.4)]">
                  ✓
                </span>
              ) : null}
              <ProductCard
                product={juice}
                hidePrice
                hideDescription
                className={added ? "ring-2 ring-leaf-soft" : ""}
                footer={
                  <button
                    type="button"
                    onClick={() => addJuice(juice.slug)}
                    disabled={added || full}
                    className={`w-full rounded-full font-display font-bold text-[15px] py-3 inline-flex items-center justify-center gap-1.5 transition-colors ${
                      added
                        ? "bg-leaf-soft text-white cursor-default"
                        : "bg-leaf text-white hover:bg-leaf-deep"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {added ? "✓ Added" : "Add to Cart"}
                  </button>
                }
              />
            </li>
          );
        })}
      </ul>

      {/* ---- combo cart bar (this page's own; global CartIsland is hidden here) ---- */}
      <aside
        id="cart-anchor"
        aria-label="Your combo box"
        className={`fixed right-5 bottom-5 z-40 w-[min(30rem,calc(100vw-2.5rem))] rounded-[2rem] bg-leaf text-white p-4 shadow-[0_18px_50px_-12px_rgba(25,40,18,.5)] max-sm:right-3 max-sm:left-3 max-sm:bottom-3 max-sm:w-auto ${
          bump ? "cart-bump" : ""
        }`}
      >
        {/* frames — one per slot, fill with the juice photo + its standard colour ring */}
        <div className="flex flex-wrap gap-2.5 mb-3.5">
          {Array.from({ length: size }, (_, i) => {
            const slug = picks[i];
            const j = slug ? bySlug.get(slug) : null;
            return j ? (
              <div
                key={i}
                title={j.name}
                className="relative w-11 h-11 rounded-full overflow-hidden bg-cream"
                style={{ boxShadow: `inset 0 0 0 3px ${juiceColor(j.slug)}` }}
              >
                <Image
                  src={j.imageUrl}
                  alt={j.name}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                key={i}
                className="w-11 h-11 rounded-full grid place-items-center border-2 border-dashed border-white/40 text-white/60 text-sm font-bold"
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold text-[15px]">
              {full
                ? `${bundle.name} ready`
                : picks.length === 0
                  ? `Build your ${bundle.name}`
                  : `${picks.length} of ${size} added`}
            </p>
            <p className="text-xs text-white/65">
              {full
                ? "Tap × to swap a juice"
                : `Add ${remaining} more ${remaining === 1 ? "juice" : "juices"}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatINR(bundle.priceINR)}</p>
            <p className="text-[11px] text-white/65">
              {bundle.name.replace(" Box", "")} · {size} × {BOTTLE_ML} ml
            </p>
          </div>
        </div>

        {/* named product chips with standard-colour dots + remove × */}
        {picks.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-3">
            {picks.map((slug) => {
              const j = bySlug.get(slug);
              if (!j) return null;
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-2 bg-white/12 rounded-full pl-3 pr-1.5 py-1.5 text-[13px] font-semibold"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      background: juiceColor(slug),
                      boxShadow: "0 0 0 2px rgba(255,255,255,.3)",
                    }}
                  />
                  {j.name}
                  <button
                    type="button"
                    onClick={() => removeJuice(slug)}
                    aria-label={`Remove ${j.name}`}
                    className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 grid place-items-center text-[13px] font-extrabold leading-none"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={checkout}
          disabled={!full}
          className="mt-3.5 w-full flex items-center justify-between rounded-full bg-carrot px-5 py-3 font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {full ? "Checkout" : `Add ${remaining} more to check out`}
          <ChevronRight className="w-5 h-5 shrink-0" />
        </button>
      </aside>
    </>
  );
}

/** A small numbered step heading — this page is a real 1→2 sequence. */
function StepHead({
  n,
  title,
  hint,
}: {
  n: number;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="font-display text-[14px] font-extrabold text-white bg-leaf w-6 h-6 rounded-full grid place-items-center shrink-0">
        {n}
      </span>
      <h2 className="font-display text-[20px] font-bold">{title}</h2>
      <span className="text-[13px] text-ink-soft ml-auto">{hint}</span>
    </div>
  );
}
