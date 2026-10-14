import {
  getJuices,
  getSmoothies,
  getShots,
  getProduce,
  getCombos,
  getBundles,
  getPlans,
  getProducts,
} from "@glowroot/data";
import { Hero } from "@/components/Hero";
import { SeasonalSection } from "@/components/SeasonalSection";
import { ProcessSteps } from "@/components/ProcessSteps";
import { MenuSection } from "@/components/MenuSection";
import { FeatureCard } from "@/components/FeatureCard";
import { CombosSection } from "@/components/CombosSection";
import { BenefitsBand } from "@/components/BenefitsBand";
import { PlanGrid } from "@/components/PlanGrid";
import { FinalCta } from "@/components/FinalCta";

export default async function HomePage() {
  const [juices, smoothies, shots, produce, combos, bundles, plans, products] =
    await Promise.all([
      getJuices(),
      getSmoothies(),
      getShots(),
      getProduce(),
      getCombos(),
      getBundles(),
      getPlans(),
      getProducts(),
    ]);

  const smoothie = smoothies[0];
  const combo = combos[0];

  return (
    <>
      <Hero />
      <SeasonalSection produce={produce} products={products} />
      <ProcessSteps />
      <MenuSection juices={[...juices, ...shots]} />
      {smoothie ? <FeatureCard product={smoothie} /> : null}
      {combo ? (
        <CombosSection combo={combo} bundles={bundles} products={products} />
      ) : null}
      <BenefitsBand />
      <PlanGrid plans={plans} />
      <FinalCta />
    </>
  );
}
