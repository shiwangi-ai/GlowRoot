import type { Product } from "@glowroot/types";
import { Button, Eyebrow } from "@glowroot/ui";
import { ProductCarousel } from "./ProductCarousel";

/** "Our juices" section — heading row + the carousel. */
export function MenuSection({ juices }: { juices: Product[] }) {
  return (
    <section
      id="menu"
      className="anchor-offset py-[88px] bg-paper border-t border-b border-line"
    >
      <div className="max-w-wrap mx-auto px-8">
        <div className="flex justify-between items-end gap-6 flex-wrap mb-12">
          <div className="max-w-[620px]">
            <Eyebrow>Our juices</Eyebrow>
            <h2 className="text-[clamp(32px,4vw,46px)] mt-4">
              Single ingredients. Signature blends.
            </h2>
            <p className="text-[17px] text-ink-soft mt-4">
              From single-fruit and vegetable juices to our signature blends —
              every bottle pressed to order from whole produce.
            </p>
          </div>
          <Button href="/combos" variant="primary">
            Order a box
          </Button>
        </div>
        <ProductCarousel products={juices} />
      </div>
    </section>
  );
}
