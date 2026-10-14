"use client";

import { useId, useRef, useState } from "react";
import type { Order } from "@glowroot/types";
import type { CancelOrderResult } from "@/app/account/actions";
import { nextDeliveryDate, deliveryToday } from "@glowroot/data/order-schedule";
import { formatDate } from "@glowroot/utils";
import { DeliveryCalendar } from "./DeliveryCalendar";

export type CancelOrderHandler = (reason: string) => Promise<CancelOrderResult>;
export type RescheduleOrderHandler = (
  expectedDeliveryDate: string,
  selectedDate: string,
) => Promise<CancelOrderResult>;

export function CancelOrderControl({
  order,
  onCancel,
  onReschedule,
}: {
  order: Order;
  onCancel: CancelOrderHandler;
  onReschedule?: RescheduleOrderHandler;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const scheduleDialog = useRef<HTMLDialogElement>(null);
  const scheduleHeading = useRef<HTMLHeadingElement>(null);
  const [calendarSession, setCalendarSession] = useState(0);
  const scheduleHeadingId = useId();
  const [selectedDate, setSelectedDate] = useState("");
  const busy = useRef(false);
  const headingId = useId();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligible = order.status === "pending" || order.status === "confirmed";
  const nextDate = nextDeliveryDate(order.deliveryDate)?.slice(0, 10);
  const tomorrow = nextDeliveryDate(deliveryToday())!;
  const minimumDate = nextDate && nextDate > tomorrow ? nextDate : tomorrow;
  const support = `mailto:hello@glowroot.co?subject=${encodeURIComponent(`Help with order ${order.id}`)}`;

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await onCancel(reason);
      if (!result.ok) setError(result.error);
    } catch {
      setError("We couldn't complete the cancellation. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
      dialog.current?.close();
    }
  }

  async function reschedule() {
    if (busy.current || !onReschedule) return;
    busy.current = true;
    setPending(true);
    setRescheduling(true);
    setError(null);
    try {
      const result = await onReschedule(order.deliveryDate, selectedDate);
      if (!result.ok) setError(result.error);
    } catch {
      setError("We couldn't reschedule the order. Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
      setRescheduling(false);
      scheduleDialog.current?.close();
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      {error && (
        <p role="alert" className="mb-3 text-sm text-carrot">
          {error}
        </p>
      )}
      {eligible ? (
        <>
          <p className="mb-3 text-[13px] text-ink-soft">
            You can cancel or reschedule until we start pressing your order.
          </p>
          <button
            ref={cancelButton}
            type="button"
            disabled={pending}
            className="rounded-full border border-carrot/50 px-5 py-2.5 text-sm font-semibold text-carrot hover:bg-carrot/10 disabled:opacity-50"
            onClick={() => {
              setError(null);
              dialog.current?.showModal();
            }}
          >
            Cancel order
          </button>
        </>
      ) : order.status === "pressing" ? (
        <p className="text-[13px] text-ink-soft">
          Pressing has started.{" "}
          <a href={support} className="font-semibold text-leaf underline">
            Contact support to request cancellation
          </a>
          .
        </p>
      ) : order.status === "out-for-delivery" ||
        order.status === "delivered" ? (
        <p className="text-[13px] text-ink-soft">
          This order can no longer be cancelled online.{" "}
          <a href={support} className="font-semibold text-leaf underline">
            Contact support
          </a>
          .
        </p>
      ) : null}

      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onCancel={(event) => {
          if (busy.current) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-3xl border border-line bg-paper p-6 text-ink shadow-xl backdrop:bg-black/40"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <h3 id={headingId} className="font-display text-xl font-bold">
            Cancel order {order.id}?
          </h3>
          <p className="mt-3 text-sm text-ink-soft">
            Your order will not be prepared or delivered. This cannot be undone.
          </p>
          {order.type === "subscription" && (
            <p className="mt-2 text-sm text-ink-soft">
              This cancels this order only, not future subscription deliveries.
            </p>
          )}
          {order.payment?.status === "paid" && (
            <p className="mt-2 text-sm text-ink-soft">
              Cancellation does not automatically issue a refund. Contact
              support for payment help.
            </p>
          )}
          <label className="mt-5 block text-sm font-semibold">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={pending}
              className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-2 font-normal outline-none focus:border-leaf"
              placeholder="Tell us why you're cancelling"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              autoFocus
              type="button"
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Keep order
            </button>
            {onReschedule && nextDate && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setSelectedDate("");
                  setCalendarSession((session) => session + 1);
                  dialog.current?.close();
                  scheduleDialog.current?.showModal();
                  scheduleHeading.current?.focus();
                }}
                className="rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Reschedule delivery
              </button>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-carrot px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending && !rescheduling ? "Cancelling…" : "Yes, cancel order"}
            </button>
          </div>
          <p role="status" className="mt-2 text-sm text-ink-soft">
            {pending && !rescheduling ? "Cancelling your order…" : ""}
          </p>
        </form>
      </dialog>
      <dialog
        ref={scheduleDialog}
        onClose={() => cancelButton.current?.focus({ preventScroll: true })}
        aria-labelledby={scheduleHeadingId}
        onCancel={(event) => {
          if (busy.current) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-3xl border border-line bg-paper p-6 text-ink shadow-xl backdrop:bg-black/40"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void reschedule();
          }}
        >
          <h3
            ref={scheduleHeading}
            tabIndex={-1}
            id={scheduleHeadingId}
            className="font-display text-xl font-bold outline-none"
          >
            Reschedule delivery
          </h3>
          <p className="mt-3 text-sm text-ink-soft">
            Currently scheduled for {formatDate(order.deliveryDate)}
            {order.deliverySlot ? ` · ${order.deliverySlot}` : ""}.
          </p>
          <DeliveryCalendar
            key={calendarSession}
            min={minimumDate}
            value={selectedDate}
            onChange={setSelectedDate}
            disabled={pending}
          />
          <p className="mt-3 text-sm text-ink-soft">
            Your items, payment and delivery slot stay the same.
          </p>
          {order.type === "subscription" && (
            <p className="mt-2 text-sm text-ink-soft">
              Only this delivery moves; future subscription deliveries stay
              unchanged.
            </p>
          )}
          {selectedDate && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-leaf/5 p-3 text-sm font-semibold text-leaf"
            >
              New delivery: {formatDate(selectedDate)}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => scheduleDialog.current?.close()}
              className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Keep current date
            </button>
            <button
              type="submit"
              disabled={pending || !selectedDate || selectedDate < minimumDate}
              className="rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {rescheduling ? "Rescheduling…" : "Confirm new date"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
