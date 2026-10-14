import { deliverySlots, earliestDeliveryDate, getPlans } from "@glowroot/data";
import type { BillingCycle } from "@glowroot/types";
import { CheckoutClient } from "@/components/CheckoutClient";

export const metadata = { title: "Checkout — GlowRoot" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    cycle?: string;
    start?: string;
    days?: string;
  }>;
}) {
  const query = await searchParams;
  const isSubscription = Boolean(query.plan);
  const plans = await getPlans();
  const plan = plans.find((p) => p.slug === query.plan);
  const cycle: BillingCycle = query.cycle === "monthly" ? "monthly" : "weekly";
  const earliestDate = earliestDeliveryDate(new Date().toISOString());
  const requestedStart = query.start;
  const startDate =
    requestedStart &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) &&
    requestedStart >= earliestDate
      ? requestedStart
      : earliestDate;

  return (
    <div className="max-w-wrap mx-auto px-8 py-16">
      <CheckoutClient
        mode={isSubscription && plan ? "subscription" : "one-time"}
        plan={plan ?? null}
        cycle={cycle}
        earliestDate={earliestDate}
        startDate={startDate}
        deliveryDays={query.days ?? null}
        slots={deliverySlots}
      />
    </div>
  );
}
