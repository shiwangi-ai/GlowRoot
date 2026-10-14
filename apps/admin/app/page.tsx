import { ModuleHeading } from "@/components/ModuleHeading";
import Link from "next/link";
import {
  getDashboardStats,
  getOrders,
  getLowStockMaterials,
} from "@glowroot/data";
import { formatINR, formatDate } from "@glowroot/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { requirePermission, canViewCustomers } from "@/lib/access";

// always reflect the live shared order store (orders placed in the storefront)
export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "carrot" | "leaf";
}) {
  return (
    <div className="bg-paper border border-line rounded-2xl p-6">
      <div className="text-[13px] text-ink-soft font-medium">{label}</div>
      <div
        className={`font-display text-[38px] font-extrabold leading-none mt-2 ${
          tone === "carrot" ? "text-carrot" : "text-leaf"
        }`}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-[12.5px] text-ink-soft mt-2">{hint}</div>
      ) : null}
    </div>
  );
}

export default async function DashboardPage() {
  const identity = await requirePermission("dashboard.view");
  const [stats, orders, lowStock] = await Promise.all([
    getDashboardStats(),
    getOrders(),
    getLowStockMaterials(),
  ]);
  const recent = orders.slice(0, 5);

  return (
    <div>
      <ModuleHeading
        icon="dashboard"
        title="Dashboard"
        description="Orders, revenue and inventory at a glance."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Kpi
          label="Total orders"
          value={String(stats.ordersTotal)}
          hint="all time"
        />
        <Kpi
          label="Active orders"
          value={String(stats.ordersActive)}
          hint="not delivered / cancelled"
        />
        <Kpi
          label="Revenue"
          value={formatINR(stats.revenueINR)}
          hint="excludes cancelled"
        />
        <Kpi
          label="Low-stock materials"
          value={String(stats.lowStockCount)}
          hint="at or below reorder level"
          tone="carrot"
        />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-8 items-start">
        {/* recent orders */}
        <section className="bg-paper border border-line rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[18px]">Recent orders</h2>
            <Link
              href="/orders"
              className="text-[13px] text-leaf hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between gap-3 py-3 hover:bg-cream-2/50 -mx-2 px-2 rounded-lg"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[14px]">
                    {canViewCustomers(identity)
                      ? o.customer.name
                      : "Customer details restricted"}
                  </div>
                  <div className="text-[12.5px] text-ink-soft">
                    {o.id} · {formatDate(o.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold">
                    {formatINR(o.totalINR)}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6">
          {/* dispatch — the fulfilment side of the day */}
          <section className="bg-paper border border-line rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[18px]">Dispatch</h2>
              <Link
                href="/delivery"
                className="text-[13px] text-leaf hover:underline"
              >
                Partners →
              </Link>
            </div>
            <dl className="flex flex-col gap-2.5 text-[14px]">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Awaiting a partner</dt>
                <dd
                  className={
                    stats.ordersUnassigned > 0
                      ? "font-semibold text-carrot"
                      : "font-semibold"
                  }
                >
                  {stats.ordersUnassigned}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Out on the road</dt>
                <dd className="font-semibold">{stats.ordersOnRoad}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Partners available</dt>
                <dd className="font-semibold">
                  {stats.partnersAvailable}
                  <span className="text-ink-soft">
                    {" "}
                    / {stats.partnersTotal}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <dt className="text-ink-soft">
                  <Link
                    href="/locations"
                    className="hover:text-leaf hover:underline"
                  >
                    Areas serving
                  </Link>
                </dt>
                <dd className="font-semibold">
                  {stats.areasServing}
                  <span className="text-ink-soft"> / {stats.areasTotal}</span>
                </dd>
              </div>
            </dl>
          </section>

          {/* low stock */}
          <section className="bg-paper border border-line rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[18px]">Low stock</h2>
              <Link
                href="/materials"
                className="text-[13px] text-leaf hover:underline"
              >
                Inventory →
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-[14px] text-ink-soft">
                Everything is well stocked.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {lowStock.map((m) => (
                  <li key={m.id} className="flex justify-between items-center">
                    <span className="text-[14px]">{m.name}</span>
                    <span className="text-[13px] text-carrot font-semibold">
                      {m.stock} / {m.reorderLevel} {m.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
