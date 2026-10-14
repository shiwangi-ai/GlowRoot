import Image from "next/image";
import Link from "next/link";
import type { Bundle, Combo, Product } from "@glowroot/types";
import { Eyebrow, ArrowRight } from "@glowroot/ui";
import { formatINR, BOTTLE_ML } from "@glowroot/utils";
import { SectionHead } from "./SectionHead";
import { BundleCard } from "./BundleCard";
import { AddToCartButton } from "./AddToCartButton";

// swatch colours per included product (mirrors the prototype's hardcoded dots)
const swatches: Record<string, string> = {
  "deep-roots": "#a3253f",
  "green-roots": "#6fa03e",
  "golden-glow": "#e8b23f",
};

export function CombosSection({
  combo,
  bundles,
  products,
}: {
  combo: Combo;
  bundles: Bundle[];
  products: Product[];
}) {
  const save = combo.wasPriceINR ? combo.wasPriceINR - combo.priceINR : 0;
  const included = combo.itemSlugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));

  // a synthetic product so the combo can be added to the cart as one line item
  const comboProduct: Product = {
    slug: combo.slug,
    name: combo.name,
    kind: "juice",
    priceINR: combo.priceINR,
    volumeMl: BOTTLE_ML * combo.quantity,
    ingredients: included.map((p) => p.name),
    description: `A one-time box of ${combo.quantity} cold-pressed bottles.`,
    imageUrl: "/assets/combo-trio.png",
    tags: ["Combo"],
    recipe: [],
  };

  return (
    <section id="combos" className="anchor-offset py-[88px] relative">
      <div className="max-w-wrap mx-auto px-8">
        <SectionHead
          eyebrow="Combos & gifting · one-time"
          title={
            <>
              Buy a box,{" "}
              <span className="script text-[1.12em]">share the glow</span>
            </>
          }
          intro={
            <>
              One-off boxes for trying, sharing or gifting — order once, no
              commitment. Want it delivered on repeat instead?{" "}
              <Link
                href="/subscribe"
                className="text-leaf font-semibold underline"
              >
                See subscription plans →
              </Link>
            </>
          }
          className="mb-[46px]"
        />

        {/* combo hero */}
        <div className="grid md:grid-cols-[1.15fr_.85fr] gap-12 items-center bg-paper border border-line rounded-[28px] overflow-hidden shadow-[0_30px_60px_-34px_rgba(40,55,25,.45)]">
          <div className="relative h-full min-h-[300px] md:min-h-[380px] bg-cream-2">
            {save > 0 ? (
              <span className="absolute top-[22px] left-[22px] z-[2] bg-carrot text-white font-bold text-[13px] tracking-[.04em] px-4 py-2 rounded-full shadow-[0_10px_22px_-10px_rgba(217,119,46,.8)]">
                Best value · Save 15%
              </span>
            ) : null}
            <Image
              src="/assets/combo-trio.png"
              alt={combo.name}
              fill
              sizes="(max-width: 900px) 100vw, 640px"
              className="object-cover"
            />
          </div>
          <div className="p-8 md:pr-12 md:py-12 md:pl-0">
            <Eyebrow>The signature trio</Eyebrow>
            <h3 className="text-[clamp(26px,3vw,34px)] my-3.5">{combo.name}</h3>
            <p className="text-[16px] text-ink-soft max-w-[420px]">
              {combo.quantity} × {BOTTLE_ML} ml cold-pressed bottles — one of
              each colour, balanced across fruit and vegetable blends.
            </p>
            <ul className="list-none my-5.5 mb-6 flex flex-col gap-3">
              {included.map((p) => (
                <li
                  key={p.slug}
                  className="flex items-center gap-3 text-[15px] font-medium"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_0_3px_rgba(0,0,0,.04)]"
                    style={{ background: swatches[p.slug] ?? "#6fa03e" }}
                  />
                  {p.name}{" "}
                  <small className="text-ink-soft font-normal ml-0.5">
                    — {p.ingredients.slice(0, 3).join(" · ").toLowerCase()}
                  </small>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-6 flex-wrap pt-6 border-t border-line">
              <div className="flex flex-col">
                <b className="font-display text-[34px] font-extrabold text-leaf leading-none">
                  {formatINR(combo.priceINR)}
                </b>
                {combo.wasPriceINR ? (
                  <span className="text-[14px] text-ink-soft mt-1.5 flex items-center gap-2.5">
                    <span className="line-through">
                      {formatINR(combo.wasPriceINR)}
                    </span>
                    <span className="text-carrot font-bold">
                      Save {formatINR(save)}
                    </span>
                  </span>
                ) : null}
              </div>
              <AddToCartButton
                product={comboProduct}
                contents={included.map((p) => ({
                  productSlug: p.slug,
                  name: p.name,
                  qty: 1,
                }))}
                label="Add combo to order"
                withArrow
              />
            </div>
          </div>
        </div>

        {/* bundle picker */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {bundles.map((b) => (
            <BundleCard key={b.slug} bundle={b} />
          ))}
        </div>
      </div>
    </section>
  );
}
