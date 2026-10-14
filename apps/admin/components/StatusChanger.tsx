"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@glowroot/types";
import { humanize } from "@glowroot/utils";
import { changeStatus } from "@/app/orders/actions";

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pressing", "cancelled"],
  pressing: ["out-for-delivery", "cancelled"],
  "out-for-delivery": ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Inline status control on the order detail view; persists via a server action. */
export function StatusChanger({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (next: OrderStatus) => {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await changeStatus(orderId, next);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
      }
    });
  };

  const choices = [status, ...NEXT_STATUSES[status]];

  return (
    <div>
      <label className="block text-[13px] font-semibold text-ink mb-2">
        Update status
      </label>
      <div className="flex flex-wrap gap-2">
        {choices.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            disabled={pending}
            className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors disabled:opacity-60 ${
              status === s
                ? "bg-leaf text-white border-leaf"
                : "bg-cream border-line text-ink-soft hover:border-leaf"
            }`}
          >
            {humanize(s)}
          </button>
        ))}
      </div>
      {pending ? (
        <p className="text-[12px] text-ink-soft mt-2">Saving…</p>
      ) : null}
      {error ? <p className="text-[12px] text-carrot mt-2">{error}</p> : null}
      {!pending && !error && NEXT_STATUSES[status].length === 0 ? (
        <p className="text-[12px] text-ink-soft mt-2">
          This order is in a final state.
        </p>
      ) : null}
    </div>
  );
}
