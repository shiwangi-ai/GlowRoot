import {
  getOrders,
  getServiceAreas,
  getServiceConfig,
  getShops,
} from "@glowroot/data";
import { LocationsManager } from "@/components/locations/LocationsManager";
import { requirePermission } from "@/lib/access";

export const metadata = { title: "Locations — GlowRoot Admin" };
// the map and the order counts are both live files, never build-time data
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const identity = await requirePermission("settings.view");
  const [areas, config, orders, shops] = await Promise.all([
    getServiceAreas(),
    getServiceConfig(),
    getOrders(),
    getShops(),
  ]);

  // Orders still in flight, counted by pincode, so pausing or removing an area
  // can tell the operator what it would strand.
  const liveOrders: Record<string, number> = {};
  for (const order of orders) {
    if (order.status === "delivered" || order.status === "cancelled") continue;
    const pin = order.deliveryPincode;
    if (!pin) continue;
    liveOrders[pin] = (liveOrders[pin] ?? 0) + 1;
  }

  return (
    <LocationsManager
      areas={areas}
      shops={shops}
      nationwide={config.nationwide}
      liveOrders={liveOrders}
      canManage={identity.permissions.has("settings.manage")}
    />
  );
}
