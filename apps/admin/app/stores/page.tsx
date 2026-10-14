import { getShops, getServiceAreas } from "@glowroot/data";
import { requirePermission } from "@/lib/access";
import { StoresManager } from "@/components/stores/StoresManager";

export const metadata = { title: "Stores — GlowRoot Admin" };
export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const identity = await requirePermission("settings.view");
  const [shops, areas] = await Promise.all([getShops(), getServiceAreas()]);
  return (
    <StoresManager
      shops={shops}
      areas={areas}
      canManage={identity.permissions.has("settings.manage")}
    />
  );
}
