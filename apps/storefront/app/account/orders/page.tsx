import Link from "next/link";
import { Eyebrow } from "@glowroot/ui";
import { AccountOrders } from "@/components/AccountOrders";

export const metadata = { title: "My orders — GlowRoot" };

export default function AccountOrdersPage() {
  return (
    <div className="max-w-[900px] mx-auto px-8 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your account</Eyebrow>
          <h1 className="mt-2 text-[clamp(28px,4vw,40px)]">My orders</h1>
        </div>
        <Link
          href="/track"
          className="text-[14px] font-semibold text-leaf underline"
        >
          Track by order number →
        </Link>
      </div>

      <div className="mt-9">
        <AccountOrders />
      </div>
    </div>
  );
}
