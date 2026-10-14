"use client";

import { useEffect, useState } from "react";
import { Button } from "@glowroot/ui";
import { useAuth } from "./AuthProvider";
import { OrderDetailCard } from "./OrderDetailCard";
import {
  cancelMyOrder,
  rescheduleMyOrder,
  fetchMyOrder,
  type OrderView,
} from "@/app/account/actions";

type Load = { state: "loading" } | { state: "done"; view: OrderView | null };

/**
 * One order from the signed-in customer's history, with its tracking timeline.
 * The server matches the ID against the *session* email, so a guessed order ID
 * belonging to someone else resolves to nothing.
 */
export function AccountOrderDetail({ orderId }: { orderId: string }) {
  const { customer } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    if (!customer) return;
    let active = true;
    fetchMyOrder(orderId).then((view) => {
      if (active) setLoad({ state: "done", view });
    });
    return () => {
      active = false;
    };
  }, [customer, orderId]);

  if (!customer) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-10 text-center">
        <h2 className="font-display text-[20px] font-bold">
          Log in to view {orderId}
        </h2>
        <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] text-ink-soft">
          Or track it with your order number and the email you ordered with — no
          account needed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            href={`/login?next=/account/orders/${orderId}`}
            variant="primary"
          >
            Log in
          </Button>
          <Button href={`/track?order=${orderId}`} variant="ghost">
            Track this order
          </Button>
        </div>
      </div>
    );
  }

  if (load.state === "loading") {
    return <p className="text-[14.5px] text-ink-soft">Loading order…</p>;
  }

  if (!load.view) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-10 text-center">
        <h2 className="font-display text-[20px] font-bold">
          We couldn&apos;t find {orderId}
        </h2>
        <p className="mx-auto mt-2 max-w-[440px] text-[14.5px] text-ink-soft">
          No order with that number was placed with {customer.email}. If you
          ordered with a different email, track it by order number instead.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/account/orders" variant="primary">
            Back to my orders
          </Button>
          <Button href="/track" variant="ghost">
            Track an order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <OrderDetailCard
      key={load.view.order.id}
      view={load.view}
      onReschedule={async (expectedDeliveryDate, selectedDate) => {
        const result = await rescheduleMyOrder(
          orderId,
          expectedDeliveryDate,
          selectedDate,
        );
        if (result.view) setLoad({ state: "done", view: result.view });
        return result;
      }}
      onCancel={async (reason) => {
        const result = await cancelMyOrder(load.view!.order.id, reason);
        if (result.view) setLoad({ state: "done", view: result.view });
        return result;
      }}
    />
  );
}
