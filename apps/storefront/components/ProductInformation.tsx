import type { Product } from "@glowroot/types";
import { Badge, Eyebrow } from "@glowroot/ui";
import { humanize } from "@glowroot/utils";

/** Customer-facing product information, shared by quick view and direct links. */
export function ProductInformation({
  product,
  heading = "h2",
  titleId,
}: {
  product: Product;
  heading?: "h1" | "h2";
  titleId?: string;
}) {
  const Heading = heading;
  const SectionHeading = heading === "h1" ? "h2" : "h3";

  return (
    <>
      <Eyebrow>
        {humanize(product.kind)} · {product.volumeMl} ml
      </Eyebrow>
      <Heading id={titleId} className="mt-3 text-[clamp(30px,3.5vw,44px)]">
        {product.name}
      </Heading>
      <div className="mt-3 flex flex-wrap gap-2">
        {product.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        {product.description}
      </p>
      <div className="mt-4 border-t border-line pt-3">
        <SectionHeading className="text-lg">What’s inside</SectionHeading>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Ingredients">
          {product.ingredients.map((ingredient) => (
            <li
              key={ingredient}
              className="rounded-full border border-leaf/15 bg-leaf/5 px-3 py-1.5 text-sm font-medium text-leaf"
            >
              {ingredient}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
