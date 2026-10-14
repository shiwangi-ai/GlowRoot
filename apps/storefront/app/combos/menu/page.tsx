import Link from "next/link";
import { getBundles, getJuices } from "@glowroot/data";
import { ComboMenu } from "@/components/ComboMenu";

export const metadata = { title: "Build a combo box — GlowRoot" };

export default async function ComboMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string }>;
}) {
  const query = await searchParams;
  const [bundles, juices] = await Promise.all([getBundles(), getJuices()]);
  // Show the juices A→Z so the menu is easy to scan.
  const sorted = [...juices].sort((a, b) => a.name.localeCompare(b.name));

  // Pre-select the box the customer clicked ("Build Sampler Box" → ?box=sampler-box).
  const initialBundleSlug =
    bundles.find((b) => b.slug === query.box)?.slug ?? bundles[0]?.slug ?? "";

  return (
    <div className="max-w-wrap mx-auto px-8 pt-10 pb-72">
      <Link
        href="/combos"
        className="text-[14px] text-ink-soft hover:text-leaf"
      >
        ← Back to combos
      </Link>
      <ComboMenu
        bundles={bundles}
        juices={sorted}
        initialBundleSlug={initialBundleSlug}
      />
    </div>
  );
}
