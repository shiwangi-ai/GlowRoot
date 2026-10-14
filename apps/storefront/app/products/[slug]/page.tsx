import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@glowroot/data";
import { ProductCard } from "@glowroot/ui";
import { ProductInformation } from "@/components/ProductInformation";
import { ProductPurchaseControls } from "@/components/ProductPurchaseControls";
import { ProductCardActions } from "@/components/ProductCardActions";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.name} — GlowRoot` : "GlowRoot" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const otherProducts = products.filter((item) => item.slug !== slug);
  const relatedProducts = [
    ...otherProducts.filter((item) => item.kind === product.kind),
    ...otherProducts.filter((item) => item.kind !== product.kind),
  ].slice(0, 3);

  return (
    <div className="max-w-wrap mx-auto px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/products"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-leaf underline underline-offset-4"
      >
        ← Browse all juices
      </Link>
      <div className="mt-5 grid items-start gap-8 md:grid-cols-2 lg:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-line bg-paper">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <ProductInformation product={product} heading="h1" />
          <ProductPurchaseControls key={product.slug} product={product} />
          <a
            href="#explore-more"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-leaf underline underline-offset-4"
          >
            Explore more juices ↓
          </a>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section
          id="explore-more"
          aria-labelledby="explore-heading"
          className="mt-12 scroll-mt-24 border-t border-line pt-8"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="explore-heading" className="text-3xl">
                Explore more juices
              </h2>
              <p className="mt-2 text-ink-soft">
                Find another favourite and add it right here.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center font-semibold text-leaf underline underline-offset-4"
            >
              View all juices →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.slug}
                product={item}
                hideDescription
                footer={<ProductCardActions product={item} />}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
