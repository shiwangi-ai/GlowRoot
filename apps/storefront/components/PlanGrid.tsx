"use client";

import { useState } from "react";
import Link from "next/link";
import type { BillingCycle, Plan } from "@glowroot/types";
import { Button, Eyebrow, Check } from "@glowroot/ui";
import { formatINR, BOTTLE_ML } from "@glowroot/utils";

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
}) {
  return (
    <div
      className={`relative flex items-stretch mx-auto mt-[30px] w-[min(360px,90%)] bg-cream-2 border border-line rounded-full p-[5px] ${
        cycle === "monthly" ? "is-monthly" : ""
      }`}
    >
      <span
        className="absolute top-[5px] bottom-[5px] left-[5px] w-[calc(50%-5px)] bg-leaf rounded-full transition-transform duration-300 z-0"
        style={{ transform: cycle === "monthly" ? "translateX(100%)" : "none" }}
      />
      <button
        onClick={() => onChange("weekly")}
        className={`flex-1 min-w-0 relative z-[1] font-body text-[14.5px] font-semibold py-2.5 rounded-full transition-colors ${
          cycle === "weekly" ? "text-white" : "text-ink-soft"
        }`}
      >
        Weekly
      </button>
      <button
        onClick={() => onChange("monthly")}
        className={`flex-1 min-w-0 relative z-[1] inline-flex items-center justify-center gap-1.5 font-body text-[14.5px] font-semibold py-2.5 rounded-full transition-colors ${
          cycle === "monthly" ? "text-white" : "text-ink-soft"
        }`}
      >
        Monthly
        <span
          className={`text-[10.5px] font-bold tracking-[.03em] px-1.5 py-0.5 rounded-full ${
            cycle === "monthly"
              ? "bg-white/20 text-white"
              : "text-carrot bg-[rgba(217,119,46,.16)]"
          }`}
        >
          Save 12%
        </span>
      </button>
    </div>
  );
}

function PlanCard({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
  const price = plan.pricing[cycle];
  return (
    <div
      className={`relative flex flex-col rounded-3xl p-8 px-7 border-[1.5px] transition-all duration-200 hover:-translate-y-1.5 hover:shadow-card ${
        plan.featured
          ? "border-leaf bg-paper shadow-[0_26px_48px_-30px_rgba(40,55,25,.4)]"
          : "border-line bg-cream"
      }`}
    >
      {plan.featured ? (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-leaf text-white text-[11px] font-bold tracking-[.06em] uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
          Most popular
        </span>
      ) : null}
      <h3 className="text-[23px]">{plan.name}</h3>
      <p className="text-[14px] text-ink-soft mt-2 min-h-[42px]">
        {plan.blurb}
      </p>
      <div className="flex items-baseline gap-1.5 mt-5.5 mb-1">
        <span className="font-display text-[42px] font-extrabold text-leaf leading-none">
          {formatINR(price.priceINR)}
        </span>
        <span className="text-[14px] text-ink-soft font-medium">
          / {cycle === "weekly" ? "week" : "month"}
        </span>
      </div>
      <span className="text-[13px] text-leaf-soft font-semibold">
        {price.bottles} × {BOTTLE_ML} ml · {formatINR(price.perBottleINR)} each
      </span>
      <ul className="list-none my-5.5 mb-6 flex flex-col gap-3 flex-1">
        {plan.perks.map((perk) => (
          <li
            key={perk}
            className="flex items-start gap-2.5 text-[14.5px] leading-snug"
          >
            <Check className="w-[18px] h-[18px] stroke-leaf shrink-0 mt-0.5" />
            {perk}
          </li>
        ))}
      </ul>
      <Button
        href={`/subscribe/${plan.slug}?cycle=${cycle}`}
        variant={plan.featured ? "primary" : "ghost"}
        className="w-full"
      >
        Choose {plan.name.split(" ")[0]}
      </Button>
    </div>
  );
}

/** Subscription plans section with the weekly/monthly toggle (`#subscribe`). */
export function PlanGrid({ plans }: { plans: Plan[] }) {
  const [cycle, setCycle] = useState<BillingCycle>("weekly");
  return (
    <section
      id="subscribe"
      className="anchor-offset py-[88px] bg-paper border-t border-b border-line"
    >
      <div className="max-w-wrap mx-auto px-8">
        <div className="text-center max-w-[640px] mx-auto mb-8">
          <Eyebrow center>Subscribe &amp; save</Eyebrow>
          <h2 className="text-[clamp(32px,4vw,46px)] mt-4">
            Fresh juice, <span className="script text-[1.12em]">on repeat</span>
          </h2>
          <p className="text-[17px] text-ink-soft mt-4">
            Set it once and we&apos;ll press &amp; deliver on schedule — skip,
            pause or cancel anytime. Choose how often you want your fix.
          </p>
          <BillingToggle cycle={cycle} onChange={setCycle} />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-11 items-stretch">
          {plans.map((p) => (
            <PlanCard key={p.slug} plan={p} cycle={cycle} />
          ))}
        </div>

        <p className="text-center text-[14px] text-ink-soft mt-8">
          All plans are flexible — skip a week, pause for a holiday, or cancel
          anytime. No lock-in, no hidden fees. &nbsp;Prefer to order once?{" "}
          <Link href="/combos" className="text-leaf font-semibold underline">
            Browse combos &amp; gifts →
          </Link>
        </p>
      </div>
    </section>
  );
}
