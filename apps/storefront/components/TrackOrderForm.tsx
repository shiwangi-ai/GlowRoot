"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ArrowRight } from "@glowroot/ui";
import { useAuth } from "./AuthProvider";
import { OrderDetailCard } from "./OrderDetailCard";
import {
  cancelTrackedOrder,
  rescheduleTrackedOrder,
  trackOrder,
  type OrderView,
} from "@/app/account/actions";

const inputCls =
  "w-full rounded-xl border border-line bg-cream px-3.5 py-3 text-[15px] outline-none " +
  "transition-colors focus:border-leaf placeholder:text-ink-soft/60";

/**
 * Public order tracking: order number + the email it was placed with. This is
 * the way back into an order for guests, who have no account to log in to.
 * Both fields are required — an order number on its own is guessable.
 */
export function TrackOrderForm() {
  const searchParams = useSearchParams();
  const { customer } = useAuth();

  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<OrderView | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // Signed in? Their email is the one to check against — save them typing it.
  useEffect(() => {
    if (customer) setEmail((v) => v || customer.email);
  }, [customer]);

  async function submit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    setView(null);
    try {
      const res = await trackOrder(orderId, email);
      if (res.ok) {
        setView(res.view);
        setVerifiedEmail(email);
      } else {
        setView(null);
        setError(res.error);
      }
    } catch {
      setError("We couldn't look up your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-9">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-3xl border border-line bg-paper p-7"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
              Order number
            </span>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              placeholder="GR-1042"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink">
              Email you ordered with
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-carrot/40 bg-carrot/[.08] px-4 py-3 text-[14px] text-carrot">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="mt-5"
          disabled={submitting}
        >
          {submitting ? "Looking it up…" : "Track order"}
          <ArrowRight />
        </Button>
      </form>

      {view ? (
        <OrderDetailCard
          key={view.order.id}
          view={view}
          onReschedule={async (expectedDeliveryDate, selectedDate) => {
            const result = await rescheduleTrackedOrder(
              view.order.id,
              verifiedEmail,
              expectedDeliveryDate,
              selectedDate,
            );
            if (result.view) setView(result.view);
            return result;
          }}
          onCancel={async (reason) => {
            const result = await cancelTrackedOrder(
              view.order.id,
              verifiedEmail,
              reason,
            );
            if (result.view) setView(result.view);
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
