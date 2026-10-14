import type { Order, OrderStatus } from "@glowroot/types";
import { humanize } from "@glowroot/utils";

/** The happy path, in order. `cancelled` is handled separately below. */
const journey: { status: OrderStatus; blurb: string }[] = [
  { status: "pending", blurb: "We've got your order." },
  { status: "confirmed", blurb: "Payment settled and slot locked in." },
  {
    status: "pressing",
    blurb: "Your fruit is being cold-pressed this morning.",
  },
  { status: "out-for-delivery", blurb: "On the way to your address." },
  { status: "delivered", blurb: "Handed over — drink it cold." },
];

function timeOf(order: Order, status: OrderStatus): string | undefined {
  const event = order.history?.find(
    (h) => h.status === status && !h.deliveryChange,
  );
  if (event) return event.at;
  // Seed orders predate the history trail; the placed-at date is still true
  // for the first step.
  return status === "pending" ? order.createdAt : undefined;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Customer-facing status trail. Reads `order.history` (written by checkout and
 * by every admin status change), falling back to position in the journey so an
 * order that skipped a step still renders sensibly.
 */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-carrot/40 bg-carrot/[.08] px-5 py-4"
      >
        <div className="font-display text-[16px] font-bold text-carrot">
          Order cancelled
        </div>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          This order was cancelled and won&apos;t be delivered.
          {order.payment?.method === "cod" && " No payment is due."}
          {order.payment?.status === "paid" &&
            " Cancellation does not automatically issue a refund. Contact support for payment help."}
        </p>
        {order.payment?.status === "paid" && (
          <a
            href={`mailto:hello@glowroot.co?subject=${encodeURIComponent(`Payment help for order ${order.id}`)}`}
            className="mt-2 inline-block text-sm font-semibold text-leaf underline"
          >
            Contact support
          </a>
        )}
      </div>
    );
  }

  const currentIndex = journey.findIndex((s) => s.status === order.status);

  return (
    <ol className="flex flex-col">
      {journey.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const stamp = timeOf(order, step.status);
        const last = i === journey.length - 1;

        return (
          <li key={step.status} className="flex gap-4">
            {/* rail */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 grid h-5 w-5 place-items-center rounded-full border-2 ${
                  done || active
                    ? "border-leaf bg-leaf text-white"
                    : "border-line bg-paper"
                }`}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    width={11}
                    height={11}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.5}
                  >
                    <path
                      d="M20 6 9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : active ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                ) : null}
              </span>
              {!last ? (
                <span
                  className={`w-0.5 flex-1 ${done ? "bg-leaf" : "bg-line"}`}
                  aria-hidden
                />
              ) : null}
            </div>

            {/* copy */}
            <div className={`pb-6 ${last ? "pb-0" : ""}`}>
              <div
                className={`font-display text-[15px] font-bold ${
                  done || active ? "text-ink" : "text-ink-soft/70"
                }`}
              >
                {humanize(step.status)}
                {active ? (
                  <span className="ml-2 rounded-full bg-leaf/15 px-2 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-[.08em] text-leaf">
                    Now
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-0.5 text-[13px] ${
                  done || active ? "text-ink-soft" : "text-ink-soft/60"
                }`}
              >
                {step.blurb}
              </p>
              {stamp && (done || active) ? (
                <p className="mt-0.5 text-[12px] text-ink-soft/80">
                  {formatStamp(stamp)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
