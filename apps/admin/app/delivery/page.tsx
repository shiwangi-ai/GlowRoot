import {
  getOrders,
  getPartnerWorkloads,
  getServiceAreas,
} from "@glowroot/data";
import {
  DeliveryPartners,
  type UnassignedOrder,
} from "@/components/delivery/DeliveryPartners";
import type { DeliveryStop } from "@/components/delivery/DeliveryOrderMap";
import { requirePermission, canViewCustomers } from "@/lib/access";

export const metadata = { title: "Delivery partners — GlowRoot Admin" };
// roster, workload and the dispatch queue are all live files
export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const identity = await requirePermission("fulfilment.view");
  const showCustomers = canViewCustomers(identity);
  const [rows, areas, orders] = await Promise.all([
    getPartnerWorkloads(),
    getServiceAreas(),
    getOrders(),
  ]);

  const areaFor = (pincode: string) => areas.find((a) => a.pincode === pincode);

  const unassigned: UnassignedOrder[] = orders
    .filter(
      (o) =>
        !o.partnerId && o.status !== "delivered" && o.status !== "cancelled",
    )
    .map((o) => {
      const pincode = showCustomers ? (o.deliveryPincode ?? "") : "";
      const area = areaFor(pincode);
      return {
        id: o.id,
        customerName: showCustomers ? o.customer.name : "Restricted",
        pincode,
        area: area ? `${area.area}, ${area.city}` : null,
        deliveryDate: o.deliveryDate,
        status: o.status,
      };
    })
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  const stops: DeliveryStop[] = orders
    .filter(
      (order) => order.status !== "delivered" && order.status !== "cancelled",
    )
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .map((order) => ({
      id: order.id,
      address: showCustomers ? (order.customer.address?.trim() ?? "") : "",
      pincode: showCustomers ? (order.deliveryPincode ?? "") : "",
      status: order.status,
      partner:
        rows.find((row) => row.partner.id === order.partnerId)?.partner.name ??
        "Unassigned",
    }));

  return (
    <DeliveryPartners
      stops={showCustomers ? stops : []}
      canViewCustomers={showCustomers}
      rows={rows}
      areas={areas}
      unassigned={unassigned}
      canManage={identity.permissions.has("fulfilment.manage")}
    />
  );
}
