import { Button, Eyebrow, ArrowRight } from "@glowroot/ui";

export function FinalCta() {
  return (
    <section id="cta" className="anchor-offset text-center py-24">
      <div className="max-w-wrap mx-auto px-8">
        <Eyebrow center>Order today</Eyebrow>
        <h2 className="text-[clamp(34px,5vw,58px)] max-w-[760px] mx-auto mt-4.5 mt-5">
          Fresh-pressed and at your door{" "}
          <span className="script text-[1.05em]">tomorrow morning</span>
        </h2>
        <p className="text-[18px] text-ink-soft max-w-[520px] mx-auto mt-5 mb-8">
          Pick your blends, choose a delivery day, and we&apos;ll press them the
          moment your order is in.
        </p>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <Button href="/products" variant="primary">
            Start an order
            <ArrowRight />
          </Button>
          <Button href="/products" variant="ghost">
            Browse the menu
          </Button>
        </div>
      </div>
    </section>
  );
}
