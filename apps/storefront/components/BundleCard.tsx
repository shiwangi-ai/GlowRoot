import type { Bundle } from "@glowroot/types";
import { Button, ArrowRight } from "@glowroot/ui";
import { formatINR, BOTTLE_ML } from "@glowroot/utils";

/** One-time bundle-picker card (`.bundle`) — links to its build-your-box page. */
export function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <div
      className={`relative bg-paper border-[1.5px] rounded-[20px] p-7 flex flex-col gap-1.5 transition-all duration-200 hover:-translate-y-1.5 hover:shadow-card ${
        bundle.featured ? "border-leaf" : "border-line"
      }`}
    >
      {bundle.pickLabel ? (
        <span className="absolute -top-3 right-[22px] bg-leaf text-white text-[11px] font-bold tracking-[.06em] uppercase px-3 py-[5px] rounded-full">
          {bundle.pickLabel}
        </span>
      ) : null}
      <span className="font-display text-[15px] font-bold text-carrot tracking-[.04em]">
        {bundle.qtyLabel}
      </span>
      <h4 className="font-display text-[23px] font-bold">{bundle.name}</h4>
      <p className="text-[14px] text-ink-soft min-h-[40px]">
        {bundle.description}
      </p>
      <div className="flex items-baseline gap-2 my-1.5 mb-4">
        <b className="font-display text-[28px] font-extrabold text-leaf">
          {formatINR(bundle.priceINR)}
        </b>
        <span className="text-[13px] text-ink-soft">
          {formatINR(bundle.perBottleINR)} / {BOTTLE_ML} ml bottle
        </span>
      </div>
      <Button
        href={`/combos/menu?box=${bundle.slug}`}
        variant={bundle.ctaVariant}
        className="w-full mt-auto"
      >
        {bundle.ctaLabel}
        <ArrowRight />
      </Button>
    </div>
  );
}
