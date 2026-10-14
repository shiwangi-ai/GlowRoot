import { getCombos, getBundles, getProducts } from "@glowroot/data";
import { CombosSection } from "@/components/CombosSection";

export const metadata = { title: "Combos & gifting — GlowRoot" };

export default async function CombosPage() {
  const [combos, bundles, products] = await Promise.all([
    getCombos(),
    getBundles(),
    getProducts(),
  ]);
  const combo = combos[0];
  if (!combo) return null;
  return <CombosSection combo={combo} bundles={bundles} products={products} />;
}
