import Link from "next/link";
import { getOrderForTracking, getProducts, getPlans } from "@glowroot/data";
import { formatINR, formatDate, humanize } from "@glowroot/utils";
import { Button, Eyebrow } from "@glowroot/ui";
import { getSessionUser } from "@/lib/session";

export const metadata = { title: "Order confirmed — GlowRoot" };
export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const query = await searchParams;
  const orderId = query.order ?? "";
  const session = await getSessionUser();
  const [order, products, plans] = await Promise.all([
    orderId && session
      ? getOrderForTracking(orderId, session.email)
      : Promise.resolve(undefined),
    getProducts(),
    getPlans(),
  ]);

  const nameFor = (slug: string) =>
    products.find((p) => p.slug === slug)?.name ?? slug;
  const plan = order?.planSlug
    ? plans.find((p) => p.slug === order.planSlug)
    : undefined;

  return (
    <div className="max-w-[720px] mx-auto px-8 py-20">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[rgba(47,93,52,.12)] grid place-items-center mx-auto mb-6">
          <svg
            viewBox="0 0 24 24"
            width={30}
            height={30}
            fill="none"
            stroke="#2f5d34"
            strokeWidth={2.2}
          >
            <path
              d="M20 6 9 17l-5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <Eyebrow center>Order confirmed</Eyebrow>
        <h1 className="text-[clamp(30px,4vw,44px)] mt-3">
          Thank you — we&apos;re on it
        </h1>
        <p className="text-[17px] text-ink-soft max-w-[480px] mx-auto mt-4">
          Your order <b className="text-ink">{order?.id ?? orderId}</b> is in.
          Here&apos;s what&apos;s coming and when.
        </p>
      </div>

      {order ? (
        <div className="mt-10 bg-paper border border-line rounded-3xl p-7">
          {/* estimated delivery */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <div className="text-[12px] uppercase tracking-[.12em] text-ink-soft font-semibold">
                Estimated delivery
              </div>
              <div className="font-display text-[22px] font-bold text-leaf mt-1">
                {formatDate(order.deliveryDate)}
              </div>
              {order.deliverySlot ? (
                <div className="text-[14px] text-ink-soft mt-0.5">
                  {order.deliverySlot}
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-[12px] uppercase tracking-[.12em] text-ink-soft font-semibold">
                Status
              </div>
              <span className="inline-block mt-1 text-[13px] font-semibold px-3 py-1 rounded-full bg-cream-2 text-ink-soft">
                {humanize(order.status)}
              </span>
            </div>
          </div>

          {/* items */}
          <div className="py-5 border-b border-line">
            <h2 className="font-display text-[16px] mb-3">Order items</h2>
            {plan ? (
              <div className="text-[14px]">
                <div className="font-semibold">{plan.name} subscription</div>
                <div className="text-ink-soft mt-0.5">
                  {humanize(order.type)} · bottles are mixed &amp; matched each
                  delivery
                </div>
              </div>
            ) : order.items.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line">
                {order.items.map((it) => (
                  <li
                    key={it.productSlug}
                    className="flex justify-between py-2 text-[14px]"
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
            ) : (
              <p className="text-[14px] text-ink-soft">No items recorded.</p>
            )}
          </div>

          {/* payment */}
          {order.payment ? (
            <div className="py-5 border-b border-line text-[13.5px]">
              <div className="font-semibold text-ink mb-0.5">Payment</div>
              <p className="text-ink-soft">
                {order.payment.method === "cod"
                  ? "Cash on delivery — pay the rider"
                  : `${order.payment.method === "upi" ? "UPI" : "Card"}${
                      order.payment.instrumentHint
                        ? ` · ${order.payment.instrumentHint}`
                        : ""
                    } · paid`}{" "}
                · {order.payment.reference}
              </p>
            </div>
          ) : null}

          {/* delivery-to + total */}
          <div className="flex flex-wrap items-end justify-between gap-4 pt-5">
            <div className="text-[13px] text-ink-soft">
              <div className="font-semibold text-ink mb-0.5">Delivering to</div>
              {order.customer.name}
              <br />
              {order.customer.address}
            </div>
            <div className="text-right">
              <div className="text-[13px] text-ink-soft">Total</div>
              <div className="font-display text-[26px] font-extrabold text-leaf">
                {formatINR(order.totalINR)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center text-ink-soft">
          We couldn&apos;t find that order&apos;s details, but your confirmation
          number is <b>{orderId}</b>.
        </p>
      )}

      <div className="flex gap-3.5 justify-center mt-10 flex-wrap">
        <Button
          href={`/account/orders/${order?.id ?? orderId}`}
          variant="primary"
        >
          Track this order
        </Button>
        <Button href="/account/orders" variant="ghost">
          My orders
        </Button>
        <Button href="/products" variant="ghost">
          Order more juice
        </Button>
      </div>
      <p className="text-[13px] text-ink-soft mt-8 text-center">
        You can also follow this order from{" "}
        <Link
          href="/account/orders"
          className="font-semibold text-leaf underline"
        >
          your account
        </Link>
        .
      </p>
    </div>
  );
}
