import { getProducts } from "@glowroot/data";
import { SectionHead } from "@/components/SectionHead";
import { JuiceCatalogue } from "@/components/JuiceCatalogue";

export const metadata = { title: "Our juices — GlowRoot" };

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-wrap mx-auto px-8 py-16">
      <SectionHead
        eyebrow="The full menu"
        title="Find your fresh favourite."
        intro="Explore single-fruit juices, vegetable pressings, signature blends and more."
        className="mb-8"
      />

      <JuiceCatalogue products={products} />
    </div>
  );
}
