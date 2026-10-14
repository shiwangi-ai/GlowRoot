"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatDate } from "@glowroot/utils";
import { DeliveryCalendar } from "./DeliveryCalendar";

/** Compact checkout field using the same calendar as delivery rescheduling. */
export function DeliveryDatePicker({
  min,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
}: {
  min: string;
  value: string;
  onChange: (date: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const fieldId = useId();
  const errorId = useId();

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-[13px] font-semibold text-ink"
      >
        Date
      </label>
      <button
        ref={trigger}
        id={fieldId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Delivery date: ${value ? formatDate(value) : "Choose a date"}`}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
        onBlur={onBlur}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-cream px-3 py-2.5 text-left text-[15px] outline-none hover:border-leaf/50 focus-visible:border-leaf focus-visible:ring-2 focus-visible:ring-leaf/20 disabled:opacity-50"
      >
        <span>{value ? formatDate(value) : "Choose a date"}</span>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-leaf"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      </button>
      {error && (
        <p id={errorId} className="mt-1 text-[12px] text-carrot">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
          onBlur();
          trigger.current?.focus({ preventScroll: true });
        }}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-3xl border border-line bg-paper p-5 text-ink shadow-xl backdrop:bg-black/40 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className="font-display text-xl font-bold">
            Choose delivery date
          </h3>
          <button
            type="button"
            aria-label="Close calendar"
            onClick={() => dialog.current?.close()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-leaf/15 text-leaf hover:bg-leaf/10 focus-visible:outline-leaf"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {open && (
          <DeliveryCalendar
            key={min}
            min={min}
            value={value}
            disabled={disabled}
            label="Available dates"
            onChange={(date) => {
              onChange(date);
              dialog.current?.close();
            }}
          />
        )}
      </dialog>
    </div>
  );
}
