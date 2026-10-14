import { redirect } from "next/navigation";
import { getBundles } from "@glowroot/data";

/**
 * The per-box builder was superseded by the single `/combos/menu` builder,
 * which handles every box size in one place. Old links (and the "Build …"
 * buttons before they were repointed) redirect there with the size preselected.
 */
export async function generateStaticParams() {
  const bundles = await getBundles();
  return bundles.map((b) => ({ slug: b.slug }));
}

export default async function BuildBoxPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/combos/menu?box=${slug}`);
}
