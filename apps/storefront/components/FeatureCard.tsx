import Image from "next/image";
import type { Product } from "@glowroot/types";
import { Eyebrow } from "@glowroot/ui";
import { formatINR } from "@glowroot/utils";
import { SectionHead } from "./SectionHead";
import { AddToCartButton } from "./AddToCartButton";

/** New-arrivals feature band for the smoothie (`.arr-feature`). */
export function FeatureCard({ product }: { product: Product }) {
  return (
    <section
      id="arrivals"
      className="anchor-offset py-[88px] relative overflow-hidden"
    >
      <div className="max-w-wrap mx-auto px-8">
        <SectionHead
          eyebrow="Just landed"
          title={
            <>
              New arrivals —{" "}
              <span className="script text-[1.12em]">
                thick &amp; spoonable
              </span>
            </>
          }
          intro="Meet our first smoothie jars: whole fruit blended with seeds and berries into something you can sip or spoon. Same roots, fuller body."
          className="mb-[46px]"
        />

        <div className="grid md:grid-cols-[1.25fr_.75fr] items-stretch border border-line rounded-[28px] overflow-hidden shadow-[0_30px_60px_-34px_rgba(40,55,25,.45)] bg-paper">
          <div className="relative min-h-[300px] md:min-h-[420px] bg-cream-2">
            <span className="absolute top-[22px] left-[22px] z-[2] inline-flex items-center gap-1.5 bg-carrot text-white font-bold text-[12.5px] tracking-[.06em] uppercase px-[15px] py-2 rounded-full shadow-[0_10px_22px_-10px_rgba(217,119,46,.8)]">
              <span className="w-[7px] h-[7px] rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,.35)]" />
              New this week
            </span>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 900px) 100vw, 700px"
              className="object-cover"
            />
          </div>
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <Eyebrow>Smoothie jar · {product.volumeMl} ml</Eyebrow>
            <h3 className="text-[clamp(26px,3vw,36px)] my-3.5 mb-4">
              {product.name}
            </h3>
            <p className="text-[16px] text-ink-soft max-w-[380px]">
              {product.description}
            </p>
            <div className="flex flex-wrap gap-2.5 my-6 mb-7">
              {product.tags.map((t) => (
                <span
                  key={t}
                  className="text-[13px] font-semibold text-leaf bg-[rgba(90,138,74,.13)] px-3.5 py-1.5 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <span className="font-display text-[30px] font-extrabold text-leaf">
                {formatINR(product.priceINR)}{" "}
                <small className="text-[14px] font-medium text-ink-soft">
                  / jar
                </small>
              </span>
              <AddToCartButton product={product} withArrow />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
