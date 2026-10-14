import { Suspense } from "react";
import { Eyebrow } from "@glowroot/ui";
import { TrackOrderForm } from "@/components/TrackOrderForm";

export const metadata = { title: "Track your order — GlowRoot" };

export default function TrackPage() {
  return (
    <div className="max-w-wrap mx-auto px-8 py-16">
      <div className="max-w-[560px]">
        <Eyebrow>Where&apos;s my juice?</Eyebrow>
        <h1 className="mt-2 text-[clamp(28px,4vw,40px)]">Track your order</h1>
        <p className="mt-3 text-[16px] text-ink-soft">
          Enter your order number and the email you ordered with. No account
          needed — it works for guest orders too.
        </p>
      </div>

      <div className="mt-9">
        {/* The form reads `?order=` via useSearchParams. */}
        <Suspense fallback={null}>
          <TrackOrderForm />
        </Suspense>
      </div>
    </div>
  );
}
