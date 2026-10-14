"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DeliveryMap } from "./DeliveryMap";
import { useStore } from "./StoreProvider";

const PROMPT_SEEN_KEY = "glowroot.pincode-prompt-seen";

/**
 * Non-blocking "Deliver to" header control. Setting a pincode never gates the
 * catalog — it only produces a soft serviceability hint (see SoftServiceBanner).
 *
 * With `autoOpen`, the popup greets arriving visitors who have no pincode yet.
 * It stays dismissible with nothing filled in (click away or Escape), and is
 * offered once per browser session so it never nags between page views.
 */
export function PincodeControl({ autoOpen = false }: { autoOpen?: boolean }) {
  const {
    pincode,
    setPincode,
    pincodeKnown,
    pincodeServiceable,
    serviceArea,
    leadDays,
    hydrated,
  } = useStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Greet on arrival. Waits for `hydrated` so a returning visitor's stored
  // pincode is known before we decide — otherwise the popup would flash open
  // for people who already told us where they are.
  useEffect(() => {
    if (!autoOpen || !hydrated || pincodeKnown) return;
    try {
      if (window.sessionStorage.getItem(PROMPT_SEEN_KEY)) return;
      window.sessionStorage.setItem(PROMPT_SEEN_KEY, "1");
    } catch {
      /* private mode / storage disabled — just show it this once */
    }
    const t = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(t);
    // Fires on the hydration flip only; the session flag above prevents repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, hydrated]);

  // Close on any click/tap anywhere outside the control, or on Escape.
  // Listeners are in the capture phase so a stopPropagation() anywhere in the
  // tree (nav links, cards, drawers) can't keep the popup stuck open.
  useEffect(() => {
    if (!open) return;

    const closeIfOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    // pointerdown covers mouse/touch/pen; click and touchstart are fallbacks
    // for anything that doesn't emit pointer events.
    document.addEventListener("pointerdown", closeIfOutside, true);
    document.addEventListener("click", closeIfOutside, true);
    document.addEventListener("touchstart", closeIfOutside, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside, true);
      document.removeEventListener("click", closeIfOutside, true);
      document.removeEventListener("touchstart", closeIfOutside, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const label = pincodeKnown ? pincode : "set pincode";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-soft hover:text-leaf transition-colors"
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            d="M12 21c-4-4.5-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 6.5-7 11z"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
        <span>
          Deliver to:{" "}
          <b
            className={
              pincodeKnown
                ? pincodeServiceable
                  ? "text-leaf"
                  : "text-carrot"
                : "text-ink"
            }
          >
            {label}
          </b>
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 lg:left-auto lg:right-0 top-[calc(100%+12px)] z-[70] w-[320px] max-w-[calc(100vw-48px)] max-h-[70vh] overflow-y-auto bg-paper border border-line rounded-2xl p-4 shadow-pop">
          {/* The popup can open unprompted on arrival, so give it a visible way
              out alongside click-away and Escape. */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <label className="block text-[11px] uppercase tracking-[.1em] font-semibold text-ink-soft pt-1">
              Delivery pincode
            </label>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 w-6 h-6 shrink-0 rounded-lg text-lg leading-none text-ink-soft hover:text-ink"
            >
              &times;
            </button>
          </div>
          <input
            aria-label="Delivery pincode"
            inputMode="numeric"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="e.g. 400049"
            className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-[15px] outline-none focus:border-leaf"
          />
          {pincodeKnown ? (
            <p
              className={`mt-2 text-[12.5px] ${
                pincodeServiceable ? "text-leaf" : "text-carrot"
              }`}
            >
              {pincodeServiceable ? (
                <>
                  Great — we press &amp; deliver here.
                  {/* Named areas come from the admin's delivery map, so the
                      promise shown here is the one operations signed up to. */}
                  <span className="mt-0.5 block text-ink-soft">
                    {serviceArea
                      ? `${serviceArea.area}, ${serviceArea.city} · `
                      : ""}
                    {leadDays === 0
                      ? "Same-day delivery"
                      : leadDays === 1
                        ? "Next-day delivery"
                        : `Delivered in ${leadDays} days`}
                  </span>
                </>
              ) : (
                "We're not in your area yet — you can still browse."
              )}
            </p>
          ) : (
            <p className="mt-2 text-[12.5px] text-ink-soft">
              Optional — browse freely without it.
            </p>
          )}
          <DeliveryMap pincode={pincode} />
          <Link
            href="/stores"
            onClick={() => setOpen(false)}
            className="mt-4 block text-sm font-semibold text-leaf underline"
          >
            Find a GlowRoot store
          </Link>
        </div>
      ) : null}
    </div>
  );
}
