import { StatsBand } from "@glowroot/ui";

const stats = [
  { value: "100%", label: "Whole fruit & vegetables, never concentrate" },
  { value: "0g", label: "Added sugar, syrups or preservatives" },
  { value: "48h", label: "Pressed-to-fresh window we deliver within" },
  { value: "No heat", label: "Cold-pressed to protect nutrients & flavour" },
];

/** Storefront wrapper around the shared StatsBand (`#benefits`). */
export function BenefitsBand() {
  return (
    <div id="benefits" className="anchor-offset">
      <StatsBand
        heading="Goodness you can taste — and trust"
        intro="Cold-pressing keeps more of what matters in every bottle, with nothing added that doesn't belong."
        stats={stats}
      />
    </div>
  );
}
