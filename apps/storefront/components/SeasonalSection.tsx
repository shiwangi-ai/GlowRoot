import type { Produce, Product } from "@glowroot/types";
import { resolveSeasonalProduct } from "@glowroot/data/seasonal";
import { ProduceCard } from "./ProduceCard";
import { SectionHead } from "./SectionHead";

function CatHead({ kicker, note }: { kicker: string; note: string }) {
  return (
    <div className="flex items-center gap-5 mb-9">
      <span className="font-display text-[27px] font-bold text-ink whitespace-nowrap">
        {kicker}
      </span>
      <span className="flex-1 h-px bg-line" />
      <span className="text-[14px] text-ink-soft whitespace-nowrap">
        {note}
      </span>
    </div>
  );
}

/** The "Now in season" showcase — fruits + single veg + veg blends. */
export function SeasonalSection({
  produce,
  products,
}: {
  produce: Produce[];
  products: Product[];
}) {
  const fruits = produce.filter((p) => p.group === "fruit");
  const single = produce.filter((p) => p.group === "veg-single");
  const blends = produce.filter((p) => p.group === "veg-blend");

  return (
    <section
      id="seasonal"
      className="anchor-offset py-[88px] bg-paper border-t border-b border-line"
    >
      <div className="max-w-wrap mx-auto px-8">
        <SectionHead
          eyebrow="Now in season"
          title={
            <>
              Summer harvest,{" "}
              <span className="script text-[1.15em]">freshly picked</span>
            </>
          }
          intro="When the sun's at its peak, so is our fruit. These are the stars of the press right now — sweet, hydrating and bottled within hours of harvest."
          className="mb-12"
        />

        {/* Fruits */}
        <div id="fruits" className="anchor-offset mb-[60px]">
          <CatHead kicker="Fruits" note="In season now" />
          <h4 className="flex items-center gap-3 font-display text-[19px] font-semibold text-leaf mb-6">
            Single-Fruits juices
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {fruits.map((f) => (
              <ProduceCard
                key={f.id}
                item={f}
                product={resolveSeasonalProduct(f, products)}
              />
            ))}
          </div>
        </div>

        {/* Vegetables */}
        <div id="vegetables" className="anchor-offset">
          <CatHead kicker="Vegetables" note="Earthy & cold-pressed" />
          <div className="mt-[30px]">
            <h4 className="flex items-center gap-3 font-display text-[19px] font-semibold text-leaf mb-6">
              Single-vegetable juices
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {single.map((v) => (
                <ProduceCard
                  key={v.id}
                  item={v}
                  product={resolveSeasonalProduct(v, products)}
                />
              ))}
            </div>
          </div>
          <div className="mt-[42px]">
            <h4 className="flex items-center gap-3 font-display text-[19px] font-semibold text-leaf mb-6">
              Vegetable-forward blends
              <span className="font-body text-[10px] tracking-[.05em] uppercase text-white bg-carrot px-2 py-0.5 rounded-full">
                Popular
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {blends.map((v) => (
                <ProduceCard
                  key={v.id}
                  item={v}
                  product={resolveSeasonalProduct(v, products)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
