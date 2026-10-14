import { ModuleHeading } from "@/components/ModuleHeading";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderById,
  getPartnerWorkloads,
  getProducts,
  getServiceAreas,
} from "@glowroot/data";
import { formatINR, formatDate, humanize } from "@glowroot/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusChanger } from "@/components/StatusChanger";
import {
  PartnerAssigner,
  type PartnerOption,
} from "@/components/PartnerAssigner";
import { requirePermission, canViewCustomers } from "@/lib/access";

// render on demand so storefront-placed orders (and status changes) are live
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await requirePermission("orders.view");
  const { id } = await params;
  const [order, products, workloads, areas] = await Promise.all([
    getOrderById(id),
    getProducts(),
    getPartnerWorkloads(),
    getServiceAreas(),
  ]);
  if (!order) notFound();

  const nameFor = (slug: string) =>
    products.find((p) => p.slug === slug)?.name ?? slug;

  const showCustomers = canViewCustomers(identity);
  const pincode = showCustomers ? (order.deliveryPincode ?? null) : null;
  const area = pincode ? areas.find((a) => a.pincode === pincode) : undefined;

  // Inactive partners are not offered — assigning to one would strand the drop.
  const options: PartnerOption[] = workloads
    .filter(({ partner }) => partner.status !== "inactive")
    .map(({ partner, activeOrders }) => ({
      id: partner.id,
      name: partner.name,
      phone: partner.phone,
      covers: pincode ? partner.zones.includes(pincode) : false,
      load: `${activeOrders}/${partner.capacityPerSlot}`,
    }));
  const current = options.find((o) => o.id === order.partnerId) ?? null;

  return (
    <div className="max-w-[900px]">
      <Link
        href="/orders"
        className="text-[14px] text-ink-soft hover:text-leaf"
      >
        ← All orders
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
        <ModuleHeading icon="orders" title={`Order ${order.id}`} />
        <StatusBadge status={order.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <section className="bg-paper border border-line rounded-2xl p-6">
          <h2 className="font-display text-[16px] mb-3">Customer</h2>
          {showCustomers ? (
            <dl className="text-[14px] flex flex-col gap-1.5">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Name</dt>
                <dd className="text-right">{order.customer.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Email</dt>
                <dd className="text-right">{order.customer.email}</dd>
              </div>
              {order.customer.phone ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Phone</dt>
                  <dd className="text-right">{order.customer.phone}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Address</dt>
                <dd className="text-right">{order.customer.address}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-ink-soft">
              Customer details are available to Super Admin and Admin only.
            </p>
          )}
        </section>

        <section className="bg-paper border border-line rounded-2xl p-6">
          <h2 className="font-display text-[16px] mb-3">Fulfilment</h2>
          <dl className="text-[14px] flex flex-col gap-1.5">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Type</dt>
              <dd className="text-right">{humanize(order.type)}</dd>
            </div>
            {order.planSlug ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Plan</dt>
                <dd className="text-right">{order.planSlug}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Placed</dt>
              <dd className="text-right">{formatDate(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="text-right">
                {formatDate(order.deliveryDate)}
                {order.deliverySlot ? (
                  <span className="block text-[12.5px] text-ink-soft">
                    {order.deliverySlot}
                  </span>
                ) : null}
              </dd>
            </div>
            {pincode ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Pincode</dt>
                <dd className="text-right">
                  {pincode}
                  <span className="block text-[12.5px] text-ink-soft">
                    {area
                      ? `${area.area}, ${area.city}`
                      : "Not on the delivery map"}
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="bg-paper border border-line rounded-2xl p-6 mt-6">
        <h2 className="font-display text-[16px] mb-3">Items</h2>
        {order.items.length === 0 ? (
          <p className="text-[14px] text-ink-soft">
            Subscription plan — bottles are mixed &amp; matched per delivery.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {order.items.map((it) => (
              <li
                key={it.productSlug}
                className="flex justify-between py-2.5 text-[14px]"
              >
                <span>
                  {nameFor(it.productSlug)}{" "}
                  <span className="text-ink-soft">× {it.qty}</span>
                </span>
                <span className="font-semibold">
                  {formatINR(it.priceINR * it.qty)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between items-baseline border-t border-line mt-3 pt-3">
          <span className="text-ink-soft">Total</span>
          <span className="font-display text-[22px] font-extrabold text-leaf">
            {formatINR(order.totalINR)}
          </span>
        </div>
      </section>

      <section className="bg-paper border border-line rounded-2xl p-6 mt-6">
        <PartnerAssigner
          orderId={order.id}
          pincode={pincode}
          current={current}
          options={options}
          canManage={identity.permissions.has("fulfilment.manage")}
        />
      </section>

      <section className="bg-paper border border-line rounded-2xl p-6 mt-6">
        <StatusChanger orderId={order.id} current={order.status} />
      </section>
      {showCustomers &&
        order.history?.some((event) => event.status === "cancelled") && (
          <section className="bg-paper border border-line rounded-2xl p-6 mt-6">
            <h2 className="font-display text-[16px] mb-3">
              Cancellation details
            </h2>
            {order.history
              .filter((event) => event.status === "cancelled")
              .map((event, index) => (
                <div key={index} className="text-sm">
                  <p>{event.note || "Order cancelled"}</p>
                  <p className="mt-1 text-ink-soft">{formatDate(event.at)}</p>
                </div>
              ))}
          </section>
        )}
      {showCustomers &&
        order.history?.some((event) => event.deliveryChange) && (
          <section className="bg-paper border border-line rounded-2xl p-6 mt-6">
            <h2 className="font-display text-[16px] mb-3">
              Delivery date changes
            </h2>
            {order.history
              .filter((event) => event.deliveryChange)
              .map((event, index) => (
                <div key={index} className="mt-3 text-sm">
                  <p>
                    {formatDate(event.deliveryChange!.from)} →{" "}
                    {formatDate(event.deliveryChange!.to)}
                  </p>
                  <p className="mt-1 text-ink-soft">
                    {event.note} · {formatDate(event.at)}
                  </p>
                </div>
              ))}
          </section>
        )}
    </div>
  );
}
