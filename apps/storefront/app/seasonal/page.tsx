import { getProduce, getProducts } from "@glowroot/data";
import { SeasonalSection } from "@/components/SeasonalSection";

export const metadata = { title: "Seasonal harvest — GlowRoot" };

export default async function SeasonalPage() {
  const [produce, products] = await Promise.all([getProduce(), getProducts()]);
  return <SeasonalSection produce={produce} products={products} />;
}
