"use client";

import Link from "next/link";
import { useStore } from "./StoreProvider";

/**
 * Soft, non-blocking banner shown only when a known pincode is out of area.
 * Never gates browsing — the hard serviceability check happens at checkout.
 */
export function SoftServiceBanner() {
  const { pincodeKnown, pincodeServiceable, pincode } = useStore();
  if (!pincodeKnown || pincodeServiceable) return null;

  return (
    <div className="bg-carrot/[.12] border-b border-carrot/30 text-ink">
      <div className="max-w-wrap mx-auto px-8 py-2.5 text-[13.5px] flex items-center justify-center gap-2 text-center flex-wrap">
        <span>
          We&apos;re not in your area yet ({pincode}) — but you can keep
          browsing.
        </span>
        <Link href="/subscribe" className="font-semibold text-carrot underline">
          Join the waitlist →
        </Link>
      </div>
    </div>
  );
}
