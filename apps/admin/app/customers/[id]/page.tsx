import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@glowroot/db";
import { ModuleHeading } from "@/components/ModuleHeading";
import { StatusBadge } from "@/components/StatusBadge";
import { requireCustomerAdmin } from "@/lib/access";
import { formatDate, formatINR, humanize } from "@glowroot/utils";
import type { OrderStatus } from "@glowroot/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer profile — GlowRoot Admin" };

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireCustomerAdmin();
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  const customer = await db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      pincode: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!customer) notFound();
  const [total, spend] = await Promise.all([
    db.customerOrder.count({ where: { customerId: id } }),
    db.customerOrder.aggregate({
      where: { customerId: id, status: { not: "cancelled" } },
      _sum: { totalINR: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1),
  );
  const orders = await db.customerOrder.findMany({
    where: { customerId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 25,
    skip: (page - 1) * 25,
    select: {
      id: true,
      createdAt: true,
      totalINR: true,
      status: true,
      type: true,
      planSlug: true,
    },
  });
  return (
    <div className="max-w-[1100px]">
      <Link href="/customers" className="text-sm text-ink-soft hover:text-leaf">
        ← All customers
      </Link>
      <div className="mt-4">
        <ModuleHeading
          icon="customers"
          title={customer.name || "Customer profile"}
          description="Contact details and purchase history."
        />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="mb-4 font-display text-lg">Customer details</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Email", customer.email],
              ["Phone", customer.phone],
              ["Address", customer.address],
              ["Pincode", customer.pincode],
              ["Added", formatDate(customer.createdAt.toISOString())],
              ["Last updated", formatDate(customer.updatedAt.toISOString())],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-5">
                <dt className="shrink-0 text-ink-soft">{label}</dt>
                <dd className="break-words text-right">
                  {value || "Not provided"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-line bg-paper p-6">
          <h2 className="mb-4 font-display text-lg">Purchase summary</h2>
          <p className="text-sm text-ink-soft">Total orders</p>
          <p className="mt-1 font-display text-3xl text-leaf">{total}</p>
          <p className="mt-5 text-sm text-ink-soft">
            Order value · excluding cancelled orders
          </p>
          <p className="mt-1 font-display text-3xl text-leaf">
            {formatINR(spend._sum.totalINR ?? 0)}
          </p>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-line bg-paper p-6">
        <h2 className="mb-4 font-display text-lg">Order history</h2>
        {!orders.length && (
          <p className="text-sm text-ink-soft">
            This customer has not placed an order yet.
          </p>
        )}
        <ul className="divide-y divide-line">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <Link
                  href={`/orders/${order.id}`}
                  className="font-semibold text-leaf hover:underline"
                >
                  {order.id}
                </Link>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatDate(order.createdAt.toISOString())} ·{" "}
                  {humanize(order.type)}
                  {order.planSlug ? ` · ${humanize(order.planSlug)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold">
                  {formatINR(order.totalINR)}
                </span>
                <StatusBadge status={order.status as OrderStatus} />
              </div>
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <nav
            aria-label="Order history pages"
            className="mt-4 flex justify-between text-sm"
          >
            <span>
              {page > 1 && (
                <Link href={`?page=${page - 1}`} className="text-leaf">
                  ← Previous
                </Link>
              )}
            </span>
            <span>
              Page {page} of {pages}
            </span>
            <span>
              {page < pages && (
                <Link href={`?page=${page + 1}`} className="text-leaf">
                  Next →
                </Link>
              )}
            </span>
          </nav>
        )}
      </section>
    </div>
  );
}
