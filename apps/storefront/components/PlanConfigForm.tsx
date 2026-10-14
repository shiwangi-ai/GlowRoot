"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BillingCycle } from "@glowroot/types";
import { Button, ArrowRight } from "@glowroot/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Confirms start date + delivery days, then hands off to checkout. */
export function PlanConfigForm({
  planSlug,
  cycle,
}: {
  planSlug: string;
  cycle: BillingCycle;
}) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [days, setDays] = useState<string[]>(["Mon", "Thu"]);

  // earliest start = tomorrow (press-and-deliver lead time)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const toggleDay = (d: string) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const proceed = () => {
    const params = new URLSearchParams({
      plan: planSlug,
      cycle,
      start: start || minDate,
      days: days.join(","),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-[13px] font-semibold text-ink mb-2">
          Start date
        </label>
        <input
          type="date"
          min={minDate}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-[15px] outline-none focus:border-leaf"
        />
        <p className="text-[12px] text-ink-soft mt-1.5">
          Earliest {minDate} — we press the morning of delivery.
        </p>
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-ink mb-2">
          Delivery days
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                days.includes(d)
                  ? "bg-leaf text-white border-leaf"
                  : "bg-cream border-line text-ink-soft hover:border-leaf"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        className="w-full mt-2"
        onClick={proceed}
        disabled={days.length === 0}
      >
        Continue to checkout
        <ArrowRight />
      </Button>
      <p className="text-[12px] text-ink-soft text-center">
        Cadence is set — checkout only needs your pincode &amp; address.
      </p>
    </div>
  );
}
