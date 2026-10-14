import { getProducts, getMaterials } from "@glowroot/data";
import { requirePermission } from "@/lib/access";
import { ProductsManager } from "@/components/products/ProductsManager";

export const metadata = { title: "Products — GlowRoot Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const identity = await requirePermission("catalogue.view");
  const [products, materials] = await Promise.all([
    getProducts(),
    getMaterials(),
  ]);
  const publish = identity.permissions.has("catalogue.publish");
  return (
    <ProductsManager
      products={products}
      materials={materials}
      canCreate={publish && identity.permissions.has("catalogue.create")}
      canEdit={publish && identity.permissions.has("catalogue.edit")}
      canChangePrice={identity.permissions.has("catalogue.change_price")}
    />
  );
}
