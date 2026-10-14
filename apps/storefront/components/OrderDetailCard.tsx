import { formatINR, formatDate, humanize } from "@glowroot/utils";
import type { OrderView } from "@/app/account/actions";
import { OrderTimeline } from "./OrderTimeline";
import {
  CancelOrderControl,
  type CancelOrderHandler,
  type RescheduleOrderHandler,
} from "./CancelOrderControl";

const paymentLabel: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  cod: "Cash on delivery",
};

/**
 * Everything a customer should see about one order: where it is, what's in it,
 * where it's going and how it was paid for. Shared by the account area and the
 * public /track page so both stay identical.
 */
export function OrderDetailCard({
  view,
  onCancel,
  onReschedule,
}: {
  view: OrderView;
  onCancel?: CancelOrderHandler;
  onReschedule?: RescheduleOrderHandler;
}) {
  const { order, lines, summary, partner } = view;
  const payment = order.payment;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_.85fr] items-start">
      {/* tracking */}
      <section className="rounded-3xl border border-line bg-paper p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="font-display text-[20px] font-bold">{order.id}</h2>
            <p className="text-[13px] text-ink-soft">
              Placed {formatDate(order.createdAt)}
            </p>
          </div>
          {order.status !== "cancelled" && (
            <div className="text-right">
              <div className="text-[12px] uppercase tracking-[.12em] font-semibold text-ink-soft">
                Arriving
              </div>
              <div className="font-display text-[17px] font-bold text-leaf">
                {formatDate(order.deliveryDate)}
              </div>
              {order.deliverySlot ? (
                <div className="text-[12.5px] text-ink-soft">
                  {order.deliverySlot}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="pt-6">
          <OrderTimeline order={order} />
        </div>
        {order.status !== "cancelled" &&
          order.history?.some((event) => event.deliveryChange) && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-leaf/5 p-3 text-sm text-leaf"
            >
              Delivery rescheduled to {formatDate(order.deliveryDate)}
              {order.deliverySlot ? ` · ${order.deliverySlot}` : ""}.
            </p>
          )}
        {onCancel && (
          <CancelOrderControl
            order={order}
            onCancel={onCancel}
            onReschedule={onReschedule}
          />
        )}

        {/* Who's bringing it — filled in once dispatch assigns a partner. */}
        {partner && order.status !== "cancelled" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-cream px-4 py-3.5">
            <div className="text-[13.5px]">
              <div className="font-semibold text-ink">
                {order.status === "delivered"
                  ? "Delivered by"
                  : "Your delivery partner"}
              </div>
              <p className="text-ink-soft">
                {partner.name} · {humanize(partner.vehicle)}
              </p>
            </div>
            {partner.phone ? (
              <a
                href={`tel:${partner.phone}`}
                className="rounded-full border border-leaf px-4 py-2 text-[12.5px] font-semibold text-leaf hover:bg-[rgba(90,138,74,.08)]"
              >
                Call {partner.phone}
              </a>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* what & where */}
      <aside className="rounded-3xl border border-line bg-paper p-7">
        <h3 className="font-display text-[16px] mb-3">Order details</h3>

        {lines.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line border-b border-line">
            {lines.map((l, i) => (
              <li
                key={`${l.name}-${i}`}
                className="flex justify-between gap-3 py-2.5 text-[14px]"
              >
                <span className="min-w-0">
                  {l.name} <span className="text-ink-soft">× {l.qty}</span>
                  {l.detail ? (
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
                      {l.detail}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-semibold">
                  {formatINR(l.priceINR * l.qty)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-b border-line pb-3 text-[14px]">{summary}</p>
        )}

        <div className="flex items-baseline justify-between py-3.5 border-b border-line">
          <span className="text-ink-soft text-[14px]">Total</span>
          <span className="font-display text-[20px] font-extrabold text-leaf">
            {formatINR(order.totalINR)}
          </span>
        </div>

        <div className="py-3.5 border-b border-line text-[13px]">
          <div className="font-semibold text-ink mb-0.5">Payment</div>
          {payment ? (
            <p className="text-ink-soft">
              {paymentLabel[payment.method] ?? humanize(payment.method)}
              {payment.instrumentHint ? ` · ${payment.instrumentHint}` : ""}
              <br />
              <span
                className={
                  payment.status === "paid"
                    ? "text-leaf"
                    : payment.status === "failed"
                      ? "text-carrot"
                      : "text-ink-soft"
                }
              >
                {payment.status === "paid"
                  ? "Paid"
                  : payment.status === "pending"
                    ? order.status === "cancelled"
                      ? "No payment due"
                      : "Due on delivery"
                    : "Failed"}
              </span>{" "}
              · {payment.reference}
            </p>
          ) : (
            <p className="text-ink-soft">
              Recorded before payments were captured.
            </p>
          )}
        </div>

        <div className="pt-3.5 text-[13px]">
          <div className="font-semibold text-ink mb-0.5">
            {order.status === "cancelled"
              ? "Delivery address"
              : "Delivering to"}
          </div>
          <p className="text-ink-soft">
            {order.customer.name}
            <br />
            {order.customer.address}
            {order.customer.phone ? (
              <>
                <br />
                {order.customer.phone}
              </>
            ) : null}
          </p>
        </div>
      </aside>
    </div>
  );
}
