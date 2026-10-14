"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnGhost, btnPrimary, selectCls } from "@/components/ui/form";
import { assignPartner } from "@/app/orders/actions";

export type PartnerOption = {
  id: string;
  name: string;
  phone: string;
  covers: boolean;
  load: string; // "3/12"
};

/**
 * Dispatch control on the order detail view.
 *
 * Partners who cover the order's pincode are listed first; the rest stay
 * selectable because dispatch overrides a zone often enough that hiding them
 * would just send the operator to another screen.
 */
export function PartnerAssigner({
  orderId,
  pincode,
  current,
  options,
  canManage,
}: {
  orderId: string;
  pincode: string | null;
  current: PartnerOption | null;
  options: PartnerOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(current?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const covering = options.filter((o) => o.covers);
  const others = options.filter((o) => !o.covers);

  function submit(partnerId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await assignPartner(orderId, partnerId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div>
      <h2 className="font-display text-[16px]">Delivery partner</h2>

      {current ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-cream p-4">
          <div>
            <div className="text-[14px] font-semibold">{current.name}</div>
            <div className="text-[12.5px] text-ink-soft">
              {current.id} · {current.phone} · carrying {current.load}
              {pincode && !current.covers ? (
                <span className="text-carrot"> · outside their zones</span>
              ) : null}
            </div>
          </div>
          {canManage ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setChoice("");
                submit(null);
              }}
              className={btnGhost}
            >
              Unassign
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[13.5px] text-ink-soft">
          Nobody is carrying this order yet.
        </p>
      )}

      {canManage ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={choice}
            aria-label="Choose a delivery partner"
            onChange={(e) => setChoice(e.target.value)}
            className={selectCls}
          >
            <option value="">
              {current ? "Reassign to…" : "Choose a partner…"}
            </option>
            {covering.length ? (
              <optgroup label={pincode ? `Covers ${pincode}` : "In zone"}>
                {covering.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.load}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {others.length ? (
              <optgroup label="Other partners (out of zone)">
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.load}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <button
            type="button"
            disabled={pending || !choice || choice === current?.id}
            onClick={() => submit(choice)}
            className={btnPrimary}
          >
            {pending ? "Saving…" : current ? "Reassign" : "Assign"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[12px] text-carrot">{error}</p> : null}
    </div>
  );
}
