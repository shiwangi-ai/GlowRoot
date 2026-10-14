import { ModuleHeading } from "@/components/ModuleHeading";
import { OrdersList } from "@/components/OrdersList";
import Link from "next/link";
import { getDeliveryPartners, getOrders } from "@glowroot/data";
import { requirePermission, canViewCustomers } from "@/lib/access";

export const metadata = { title: "Orders — GlowRoot Admin" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const identity = await requirePermission("orders.view");
  const showCustomers = canViewCustomers(identity);
  const [orders, partners] = await Promise.all([
    getOrders(),
    getDeliveryPartners(),
  ]);
  const unassigned = orders.filter(
    (o) => !o.partnerId && o.status !== "delivered" && o.status !== "cancelled",
  ).length;
  return (
    <OrdersList
      orders={orders.map((order) => ({
        id: order.id,
        customer: {
          name: showCustomers ? order.customer.name : "Restricted",
          email: showCustomers ? order.customer.email : "",
          phone: showCustomers ? order.customer.phone : undefined,
        },
        type: order.type,
        planSlug: order.planSlug,
        createdAt: order.createdAt,
        totalINR: order.totalINR,
        status: order.status,
        partnerName:
          partners.find((partner) => partner.id === order.partnerId)?.name ??
          null,
      }))}
      heading={
        <ModuleHeading
          icon="orders"
          title="Orders"
          description={
            <>
              {orders.length} orders in the system.
              {unassigned > 0 ? (
                <>
                  {" "}
                  <Link
                    href="/delivery"
                    className="font-semibold text-carrot hover:underline"
                  >
                    {unassigned} awaiting a delivery partner →
                  </Link>
                </>
              ) : null}
            </>
          }
        />
      }
    />
  );
}
