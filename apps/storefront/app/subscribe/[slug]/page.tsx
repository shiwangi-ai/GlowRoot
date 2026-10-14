import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlans } from "@glowroot/data";
import type { BillingCycle } from "@glowroot/types";
import { Badge, Eyebrow } from "@glowroot/ui";
import { formatINR, BOTTLE_ML } from "@glowroot/utils";
import { PlanConfigForm } from "@/components/PlanConfigForm";

export async function generateStaticParams() {
  const plans = await getPlans();
  return plans.map((p) => ({ slug: p.slug }));
}

export default async function PlanConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const plans = await getPlans();
  const plan = plans.find((p) => p.slug === slug);
  if (!plan) notFound();

  const cycle: BillingCycle = query.cycle === "monthly" ? "monthly" : "weekly";
  const price = plan.pricing[cycle];

  return (
    <div className="max-w-wrap mx-auto px-8 py-16">
      <Link
        href="/subscribe"
        className="text-[14px] text-ink-soft hover:text-leaf"
      >
        ← Back to plans
      </Link>

      <div className="grid md:grid-cols-[1fr_.9fr] gap-12 mt-6 items-start">
        <div>
          <Eyebrow>Configure your subscription</Eyebrow>
          <h1 className="text-[clamp(30px,4vw,44px)] mt-3">{plan.name}</h1>
          <p className="text-[16px] text-ink-soft mt-3 max-w-[440px]">
            {plan.blurb}
          </p>
          <div className="mt-4">
            <Badge tone="muted">
              {cycle === "weekly" ? "Billed weekly" : "Billed monthly"}
            </Badge>
          </div>

          <ul className="mt-6 flex flex-col gap-2">
            {plan.perks.map((perk) => (
              <li key={perk} className="text-[14.5px] text-ink-soft">
                • {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-paper border border-line rounded-3xl p-7">
          <div className="flex items-baseline justify-between border-b border-line pb-4 mb-5">
            <div>
              <div className="font-display text-[30px] font-extrabold text-leaf leading-none">
                {formatINR(price.priceINR)}
              </div>
              <div className="text-[13px] text-ink-soft mt-1">
                per {cycle === "weekly" ? "week" : "month"} · {price.bottles} ×{" "}
                {BOTTLE_ML} ml
              </div>
            </div>
            <span className="text-[13px] text-leaf-soft font-semibold">
              {formatINR(price.perBottleINR)} / {BOTTLE_ML} ml bottle
            </span>
          </div>
          <PlanConfigForm planSlug={plan.slug} cycle={cycle} />
        </div>
      </div>
    </div>
  );
}
