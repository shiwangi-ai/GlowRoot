import { getPlans } from "@glowroot/data";
import { PlanGrid } from "@/components/PlanGrid";

export const metadata = { title: "Subscription plans — GlowRoot" };

export default async function SubscribePage() {
  const plans = await getPlans();
  return <PlanGrid plans={plans} />;
}
