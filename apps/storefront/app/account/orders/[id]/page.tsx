import Link from "next/link";
import { Eyebrow } from "@glowroot/ui";
import { AccountOrderDetail } from "@/components/AccountOrderDetail";

export const metadata = { title: "Order — GlowRoot" };

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-wrap mx-auto px-8 py-16">
      <Link
        href="/account/orders"
        className="text-[14px] font-semibold text-ink-soft hover:text-leaf"
      >
        ← My orders
      </Link>
      <div className="mt-4">
        <Eyebrow>Tracking</Eyebrow>
        <h1 className="mt-2 text-[clamp(26px,3.6vw,38px)]">Order {id}</h1>
      </div>

      <div className="mt-9">
        <AccountOrderDetail orderId={id} />
      </div>
    </div>
  );
}
