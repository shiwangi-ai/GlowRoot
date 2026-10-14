import { ModuleHeading } from "@/components/ModuleHeading";
import {
  ListViewSection,
  RecordRow,
  RecordCell,
} from "@/components/ui/ListView";
import { getMaterials } from "@glowroot/data";
import { formatINR, humanize } from "@glowroot/utils";
import { requirePermission } from "@/lib/access";

export const metadata = { title: "Materials — GlowRoot Admin" };

export default async function MaterialsPage() {
  await requirePermission("inventory.view");
  const materials = await getMaterials();
  const lowCount = materials.filter((m) => m.stock <= m.reorderLevel).length;

  return (
    <div>
      <ListViewSection
        module="materials"
        label="Materials"
        columns={[
          "Material",
          "Category",
          "Stock",
          "Reorder at",
          "Cost / unit",
          "Status",
        ]}
        empty={materials.length === 0 ? "No materials yet." : undefined}
        heading={
          <ModuleHeading
            icon="materials"
            title="Materials"
            description={
              <>
                Raw produce inventory · {materials.length} tracked ·{" "}
                <span className="text-carrot font-semibold">
                  {lowCount} low
                </span>
                .
              </>
            }
          />
        }
      >
        {materials.map((m) => {
          const low = m.stock <= m.reorderLevel;
          return (
            <RecordRow key={m.id}>
              <RecordCell
                label="Material"
                primary
                className="px-5 py-3 font-medium"
              >
                {m.name}
              </RecordCell>
              <RecordCell label="Category" className="px-5 py-3 text-ink-soft">
                {humanize(m.category)}
              </RecordCell>
              <RecordCell label="Stock" className="px-5 py-3 tabular-nums">
                {m.stock} {m.unit}
              </RecordCell>
              <RecordCell
                label="Reorder at"
                className="px-5 py-3 tabular-nums text-ink-soft"
              >
                {m.reorderLevel} {m.unit}
              </RecordCell>
              <RecordCell
                label="Cost / unit"
                className="px-5 py-3 tabular-nums"
              >
                {formatINR(m.costPerUnitINR)}
              </RecordCell>
              <RecordCell label="Status" className="px-5 py-3">
                <span
                  className={`inline-block text-[12px] font-semibold px-2.5 py-1 rounded-full ${
                    low
                      ? "bg-[rgba(217,119,46,.16)] text-carrot"
                      : "bg-[rgba(90,138,74,.14)] text-leaf"
                  }`}
                >
                  {low ? "Reorder" : "In stock"}
                </span>
              </RecordCell>
            </RecordRow>
          );
        })}
      </ListViewSection>
    </div>
  );
}
