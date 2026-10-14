"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR, formatDate, humanize } from "@glowroot/utils";
import { Button } from "@glowroot/ui";
import { useAuth } from "./AuthProvider";
import { fetchMyOrders, type OrderView } from "@/app/account/actions";

const liveStatuses = new Set([
  "pending",
  "confirmed",
  "pressing",
  "out-for-delivery",
]);

function StatusPill({ status }: { status: string }) {
  const live = liveStatuses.has(status);
  const cancelled = status === "cancelled";
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[12.5px] font-semibold ${
        cancelled
          ? "bg-carrot/15 text-carrot"
          : live
            ? "bg-leaf/15 text-leaf"
            : "bg-cream-2 text-ink-soft"
      }`}
    >
      {humanize(status)}
    </span>
  );
}

/**
 * "My orders" — the customer's own history, newest first. `fetchMyOrders` takes
 * no argument: it reads the caller's identity from the server session, so this
 * component can't ask for anyone else's orders.
 */
export function AccountOrders() {
  const { customer } = useAuth();
  const [views, setViews] = useState<OrderView[] | null>(null);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    fetchMyOrders().then((result) => {
      if (active) setViews(result);
    });
    return () => {
      active = false;
    };
  }, [customer]);

  if (!customer) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-10 text-center">
        <h2 className="font-display text-[20px] font-bold">
          Log in to see your orders
        </h2>
        <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] text-ink-soft">
          Your order history lives with your account. Ordered as a guest? You
          can still follow it on the tracking page with your order number.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/login?next=/account/orders" variant="primary">
            Log in
          </Button>
          <Button href="/track" variant="ghost">
            Track an order
          </Button>
        </div>
      </div>
    );
  }

  if (views === null) {
    return <p className="text-[14.5px] text-ink-soft">Loading your orders…</p>;
  }

  if (views.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-10 text-center">
        <h2 className="font-display text-[20px] font-bold">No orders yet</h2>
        <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] text-ink-soft">
          Once you place an order it shows up here, with live delivery status.
        </p>
        <div className="mt-6">
          <Button href="/products" variant="primary">
            Browse the juices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {views.map(({ order, summary }) => (
        <li key={order.id}>
          <Link
            href={`/account/orders/${order.id}`}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-leaf/60"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-display text-[16px] font-bold">
                  {order.id}
                </span>
                <StatusPill status={order.status} />
              </div>
              <p className="mt-1 truncate text-[13.5px] text-ink-soft">
                {summary}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                Placed {formatDate(order.createdAt)}
                {order.status !== "cancelled" &&
                  ` · arriving ${formatDate(order.deliveryDate)}${order.deliverySlot ? ` · ${order.deliverySlot}` : ""}`}
              </p>
            </div>
            <div className="text-right">
              <div className="font-display text-[18px] font-extrabold text-leaf">
                {formatINR(order.totalINR)}
              </div>
              <span className="text-[13px] font-semibold text-ink-soft underline">
                View order
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
