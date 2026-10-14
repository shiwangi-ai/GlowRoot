"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { deliveryToday } from "@glowroot/data/order-schedule";

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthButtonClassName =
  "grid h-10 w-10 place-items-center rounded-full border border-leaf bg-leaf text-white shadow-sm transition-colors enabled:hover:bg-leaf/85 disabled:cursor-not-allowed disabled:border-leaf/15 disabled:bg-leaf/5 disabled:text-leaf/35 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf motion-reduce:transition-none";
const asDate = (value: string) => new Date(`${value}T12:00:00Z`);
const asISO = (value: Date) => value.toISOString().slice(0, 10);
const monthLabel = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayLabel = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A date-only picker: calendar navigation never changes the confirmed selection. */
export function DeliveryCalendar({
  min,
  value,
  onChange,
  disabled = false,
  label = "Choose a later delivery date",
}: {
  min: string;
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const validValue =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(asDate(value).getTime()) &&
    asISO(asDate(value)) === value;
  const initial = validValue && value >= min ? value : min;
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [active, setActive] = useState(initial);
  const focusAfterNavigation = useRef(false);
  const activeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const helpId = useId();
  const first = asDate(`${month}-01`);
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const today = deliveryToday();

  useEffect(() => {
    if (focusAfterNavigation.current) {
      activeButton.current?.focus({ preventScroll: true });
      focusAfterNavigation.current = false;
    }
  }, [active, month]);

  function moveMonth(direction: -1 | 1) {
    const next = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + direction, 1, 12),
    );
    const start = asISO(next);
    const nextActive = start < min ? min : start;
    setMonth(nextActive.slice(0, 7));
    setActive(nextActive);
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const next = asDate(date);
    const weekday = (next.getUTCDay() + 6) % 7;
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -weekday,
      End: 6 - weekday,
    };
    const shift = offsets[event.key];
    if (shift === undefined) return;
    event.preventDefault();
    next.setUTCDate(next.getUTCDate() + shift);
    const nextDate = asISO(next);
    const target = nextDate < min ? min : nextDate;
    if (target === active) return;
    focusAfterNavigation.current = true;
    setMonth(target.slice(0, 7));
    setActive(target);
  }

  return (
    <fieldset
      disabled={disabled}
      className="mt-5 min-w-0"
      aria-describedby={helpId}
    >
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="rounded-2xl border border-line bg-paper p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p
            id={headingId}
            aria-live="polite"
            className="font-display text-base font-semibold text-leaf"
          >
            {monthLabel.format(first)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous month"
              disabled={disabled || month <= min.slice(0, 7)}
              onClick={() => moveMonth(-1)}
              className={monthButtonClassName}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m14 6-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={disabled}
              onClick={() => moveMonth(1)}
              className={monthButtonClassName}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m10 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-soft"
        >
          {weekdays.map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>
        <div
          role="group"
          aria-labelledby={headingId}
          className="grid grid-cols-7 gap-1"
        >
          {Array.from({ length: offset }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {Array.from({ length: days }, (_, index) => {
            const date = `${month}-${String(index + 1).padStart(2, "0")}`;
            const selected = date === value;
            return (
              <button
                key={date}
                ref={date === active ? activeButton : undefined}
                type="button"
                tabIndex={date === active ? 0 : -1}
                disabled={disabled || date < min}
                aria-label={dayLabel.format(asDate(date))}
                aria-pressed={selected}
                aria-current={date === today ? "date" : undefined}
                onFocus={() => setActive(date)}
                onKeyDown={(event) => moveFocus(event, date)}
                onClick={() => onChange(date)}
                className={`h-10 rounded-xl text-sm font-semibold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:text-ink-soft/30 motion-reduce:transition-none ${selected ? "bg-leaf text-white shadow-sm" : "text-ink enabled:hover:bg-leaf/10"} ${date === today && !selected ? "ring-1 ring-inset ring-leaf/30" : ""}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
      <p id={helpId} className="mt-2 text-xs text-ink-soft">
        <span className="sr-only">
          {" "}
          Use arrow keys to move between dates and Enter to select.
        </span>
      </p>
    </fieldset>
  );
}
