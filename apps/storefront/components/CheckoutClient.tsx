"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BillingCycle, PaymentMethod, Plan } from "@glowroot/types";
import type { DeliverySlot } from "@glowroot/data/serviceability";
import { earliestDeliveryDate } from "@glowroot/data/serviceability";
import { Button, ArrowRight } from "@glowroot/ui";
import { formatINR } from "@glowroot/utils";
import { useStore } from "./StoreProvider";
import { DeliveryMap } from "./DeliveryMap";
import { DeliveryDatePicker } from "./DeliveryDatePicker";
import { useAuth } from "./AuthProvider";
import { placeOrder } from "@/app/checkout/actions";

type Mode = "one-time" | "subscription";

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  hint: string;
}[] = [
  { id: "upi", label: "UPI", hint: "Pay from any UPI app" },
  { id: "card", label: "Card", hint: "Credit or debit" },
  { id: "cod", label: "Cash on delivery", hint: "Pay the rider" },
];

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-ink mb-1.5">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-carrot">{error}</span>
      ) : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-[15px] outline-none focus:border-leaf";

export function CheckoutClient({
  mode,
  plan,
  cycle,
  earliestDate,
  startDate,
  deliveryDays,
  slots,
}: {
  mode: Mode;
  plan: Plan | null;
  cycle: BillingCycle;
  earliestDate: string;
  startDate: string;
  deliveryDays: string | null;
  slots: DeliverySlot[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    items,
    subtotalINR,
    pincode,
    setPincode,
    clear,
    pincodeServiceable,
    serviceArea,
    leadDays,
  } = useStore();
  const { customer } = useAuth();

  // Where login should return to. Subscription checkout carries its plan/cycle
  // in the query string, so the round trip has to preserve it.
  const query = searchParams.toString();
  const currentPath = query ? `${pathname}?${query}` : pathname;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(startDate);
  const [slot, setSlot] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [payDetail, setPayDetail] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const prefilled = useRef(false);

  // Prefill from the signed-in customer's saved profile (written by every
  // completed checkout). Runs once, and never overwrites something typed —
  // after that the fields are theirs to edit.
  useEffect(() => {
    if (!customer || prefilled.current) return;
    prefilled.current = true;
    setName((v) => v || customer.name);
    setEmail((v) => v || customer.email);
    setPhone(
      (v) => v || (customer.phone ?? "").replace(/\D/g, "").slice(0, 10),
    );
    setAddress((v) => v || (customer.address ?? ""));
    if (!pincode && customer.pincode) setPincode(customer.pincode);
  }, [customer, pincode, setPincode]);

  const pinValid = pincode.length === 6;
  const pinServiceable = pincodeServiceable;

  // Lead time is per area, so the earliest date the calendar offers moves with
  // the pincode: 400050 presses overnight, 682011 needs two days. The server
  // re-derives this from the same map before it accepts the order.
  const minDate = useMemo(
    () =>
      pinValid
        ? earliestDeliveryDate(new Date().toISOString(), leadDays)
        : earliestDate,
    [pinValid, leadDays, earliestDate],
  );

  // Cash on delivery is an area-level decision the admin makes per pincode.
  const codAllowed = !serviceArea || serviceArea.codEnabled;
  const methods = useMemo(
    () => paymentMethods.filter((m) => m.id !== "cod" || codAllowed),
    [codAllowed],
  );

  // Nudge the customer off a method their area no longer offers.
  useEffect(() => {
    if (!codAllowed && method === "cod") setMethod("upi");
  }, [codAllowed, method]);

  const total =
    mode === "subscription" && plan
      ? plan.pricing[cycle].priceINR
      : subtotalINR;

  const fieldErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Enter a valid email address.";
    if (!phone.trim())
      e.phone = "Phone is required so we can reach you for delivery.";
    else if (!/^\d{10}$/.test(phone.replace(/\D/g, "")))
      e.phone = "Enter a valid 10-digit phone number.";
    if (!address.trim()) e.address = "Delivery address is required.";
    if (!deliveryDate) e.deliveryDate = "Select a delivery date.";
    else if (deliveryDate < minDate)
      e.deliveryDate = `We need ${leadDays} day${leadDays === 1 ? "" : "s"} to press for this area — pick ${minDate} or later.`;
    if (!slot) e.slot = "Select a time slot.";
    if (
      method === "upi" &&
      !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(payDetail.trim())
    )
      e.payDetail = "Enter a valid UPI ID, e.g. name@bank.";
    if (method === "card" && payDetail.replace(/\D/g, "").length < 12)
      e.payDetail = "Enter a valid card number.";
    return e;
  }, [
    name,
    email,
    phone,
    address,
    deliveryDate,
    slot,
    method,
    payDetail,
    minDate,
    leadDays,
  ]);

  const markTouched = (field: string) =>
    setTouched((t) => ({ ...t, [field]: true }));
  const errorFor = (field: string) =>
    touched[field] || attemptedSubmit ? fieldErrors[field] : undefined;

  const canSubmit =
    pinServiceable &&
    Object.keys(fieldErrors).length === 0 &&
    (mode === "subscription" || items.length > 0);

  async function submit() {
    setAttemptedSubmit(true);
    if (!pinServiceable || Object.keys(fieldErrors).length > 0) {
      setError("Please fix the highlighted fields before continuing.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await placeOrder({
      // No email: `placeOrder` files the order against the session account.
      customer: { name, phone, address },
      pincode,
      deliveryDate,
      deliverySlot: slots.find((s) => s.id === slot)?.label,
      items: items.map((i) => ({
        productSlug: i.product.slug,
        qty: i.qty,
        priceINR: i.product.priceINR,
        contents: i.contents,
      })),
      type: mode,
      planSlug: mode === "subscription" ? plan?.slug : undefined,
      cycle: mode === "subscription" ? cycle : undefined,
      payment: {
        method,
        detail: method === "cod" ? undefined : payDetail.trim(),
        simulateFailure,
      },
    });
    setSubmitting(false);
    if (res.ok) {
      if (mode === "one-time") clear();
      router.push(`/checkout/success?order=${res.orderId}`);
    } else {
      setError(res.error);
    }
  }

  // Ordering requires an account, so the form never renders for a logged-out
  // visitor. `placeOrder` re-checks the session server-side — this gate is the
  // courtesy, not the enforcement.
  if (!customer) {
    return (
      <div className="mx-auto max-w-[520px] rounded-3xl border border-line bg-paper p-10 text-center">
        <h1 className="font-display text-[26px] font-bold">
          Log in to check out
        </h1>
        <p className="mt-2.5 text-[15px] text-ink-soft">
          Orders live in your account, so you can track deliveries and reorder
          your favourites. It takes a moment to create one.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            href={`/login?next=${encodeURIComponent(currentPath)}`}
            variant="primary"
          >
            Log in or sign up
            <ArrowRight />
          </Button>
          <Button href="/products" variant="ghost">
            Keep browsing
          </Button>
        </div>
        <p className="mt-6 text-[13px] text-ink-soft">
          Your cart is saved — it&apos;ll be waiting when you get back.
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1.2fr_.8fr] gap-12 items-start">
      {/* form */}
      <div>
        <h1 className="text-[clamp(28px,4vw,40px)]">Checkout</h1>
        <p className="text-ink-soft mt-2">
          {mode === "subscription"
            ? "Your cadence is set — we just need where to deliver."
            : "Juice is pressed to order, so delivery date is part of checkout."}
        </p>

        {/* 1. serviceability */}
        <section className="mt-8">
          <h2 className="font-display text-[18px] mb-3">
            1 · Delivery pincode
          </h2>
          <div className="flex gap-3 items-start">
            <input
              inputMode="numeric"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="6-digit pincode"
              className={`${inputCls} max-w-[220px]`}
            />
          </div>
          {pinValid ? (
            <p
              className={`mt-2 text-[13px] ${pinServiceable ? "text-leaf" : "text-carrot"}`}
            >
              {pinServiceable ? (
                <>
                  We press &amp; deliver here.
                  <span className="mt-0.5 block text-ink-soft">
                    {serviceArea
                      ? `${serviceArea.area}, ${serviceArea.city} · `
                      : ""}
                    {leadDays === 0
                      ? "pressed and delivered same day"
                      : leadDays === 1
                        ? "pressed overnight, delivered next day"
                        : `pressed to order, delivered in ${leadDays} days`}
                  </span>
                </>
              ) : (
                "Sorry — we're not serviceable here yet. Try a serviceable pincode to continue."
              )}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-soft">
              Required — serviceability is confirmed before payment.
            </p>
          )}
          {/* Visual confirmation only — the serviceability verdict above is
              still decided by the delivery map in @glowroot/data. */}
          <DeliveryMap pincode={pincode} />
        </section>

        {/* 2. delivery date + slot */}
        <section className="mt-8">
          <h2 className="font-display text-[18px] mb-3">
            2 ·{" "}
            {mode === "subscription"
              ? "First delivery"
              : "Delivery date & slot"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <DeliveryDatePicker
              min={minDate}
              value={deliveryDate}
              onChange={(date) => {
                setDeliveryDate(date);
                markTouched("deliveryDate");
              }}
              onBlur={() => markTouched("deliveryDate")}
              error={errorFor("deliveryDate")}
              disabled={submitting}
            />
            <Field label="Time slot" error={errorFor("slot")}>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                onBlur={() => markTouched("slot")}
                className={inputCls}
              >
                <option value="" disabled>
                  Select a time slot
                </option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {mode === "subscription" && deliveryDays ? (
            <p className="text-[13px] text-ink-soft mt-2">
              Recurring on: <b className="text-ink">{deliveryDays}</b>
            </p>
          ) : null}
        </section>

        {/* 3. address + contact */}
        <section className="mt-8">
          <h2 className="font-display text-[18px] mb-3">
            3 · Address & contact
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" error={errorFor("name")}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched("name")}
                className={inputCls}
              />
            </Field>
            {/* Fixed to the signed-in account: the order is filed against this
                email, and that's what order history and /track look it up by. */}
            <Field label="Email">
              <input
                type="email"
                value={email}
                readOnly
                aria-describedby="checkout-email-note"
                className={`${inputCls} cursor-not-allowed bg-cream-2 text-ink-soft`}
              />
              <span
                id="checkout-email-note"
                className="mt-1 block text-[12px] text-ink-soft"
              >
                From your account.
              </span>
            </Field>
            <Field label="Phone" error={errorFor("phone")}>
              <input
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                onBlur={() => markTouched("phone")}
                className={inputCls}
              />
            </Field>
            <Field label="Delivery address" error={errorFor("address")}>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => markTouched("address")}
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* 4. pay */}
        <section className="mt-8">
          <h2 className="font-display text-[18px] mb-3">4 · Payment</h2>
          {!codAllowed ? (
            <p className="mb-3 text-[13px] text-ink-soft">
              Cash on delivery isn&apos;t offered in{" "}
              {serviceArea?.area ?? "this area"} yet.
            </p>
          ) : null}

          <div className="grid sm:grid-cols-3 gap-3">
            {methods.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMethod(m.id);
                    setPayDetail("");
                    setError(null);
                  }}
                  aria-pressed={active}
                  className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    active
                      ? "border-leaf bg-[rgba(90,138,74,.1)]"
                      : "border-line bg-cream hover:border-leaf/50"
                  }`}
                >
                  <span className="block text-[14.5px] font-semibold text-ink">
                    {m.label}
                  </span>
                  <span className="block text-[12px] text-ink-soft">
                    {m.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {method === "upi" ? (
              <Field label="UPI ID" error={errorFor("payDetail")}>
                <input
                  value={payDetail}
                  onChange={(e) => setPayDetail(e.target.value)}
                  onBlur={() => markTouched("payDetail")}
                  placeholder="name@bank"
                  className={`${inputCls} max-w-[320px]`}
                />
              </Field>
            ) : null}
            {method === "card" ? (
              <Field label="Card number" error={errorFor("payDetail")}>
                <input
                  inputMode="numeric"
                  value={payDetail}
                  onChange={(e) =>
                    setPayDetail(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 16)
                        .replace(/(.{4})/g, "$1 ")
                        .trim(),
                    )
                  }
                  onBlur={() => markTouched("payDetail")}
                  placeholder="4111 1111 1111 1111"
                  className={`${inputCls} max-w-[320px]`}
                />
              </Field>
            ) : null}
            {method === "cod" ? (
              <p className="text-[13px] text-ink-soft">
                Pay the rider when your juice arrives. We&apos;ll confirm the
                order once we start pressing.
              </p>
            ) : null}
          </div>

          <p className="mt-3 text-[12.5px] text-ink-soft">
            Payments are mocked in this phase — no real money moves, and only a
            masked hint of the instrument is stored.
          </p>

          {method !== "cod" ? (
            <label className="mt-3 flex items-center gap-2.5 text-[12.5px] text-ink-soft">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="h-4 w-4 accent-carrot"
              />
              Simulate a declined payment (for testing the failure path)
            </label>
          ) : null}
        </section>

        {error ? (
          <p className="mt-5 rounded-xl border border-carrot/40 bg-carrot/[.08] px-4 py-3 text-[14px] text-carrot">
            {error}
          </p>
        ) : null}

        <Button
          variant="primary"
          className="mt-6"
          onClick={submit}
          disabled={!canSubmit || submitting}
        >
          {submitting
            ? method === "cod"
              ? "Placing order…"
              : "Contacting your bank…"
            : mode === "subscription"
              ? "Start subscription"
              : method === "cod"
                ? "Place order"
                : `Pay ${formatINR(total)}`}
          <ArrowRight />
        </Button>
        {!canSubmit && !submitting ? (
          <p className="mt-2 text-[12.5px] text-ink-soft">
            Complete a serviceable pincode, delivery date and address to
            continue.
          </p>
        ) : null}
      </div>

      {/* summary */}
      <aside className="bg-paper border border-line rounded-3xl p-7 sticky top-[100px]">
        <h2 className="font-display text-[18px] mb-4">Order summary</h2>
        {mode === "subscription" && plan ? (
          <div className="border-b border-line pb-4 mb-4">
            <div className="font-display font-bold text-[17px]">
              {plan.name}
            </div>
            <div className="text-[13px] text-ink-soft mt-1">
              {cycle === "weekly" ? "Weekly" : "Monthly"} ·{" "}
              {plan.pricing[cycle].bottles} bottles
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 border-b border-line pb-4 mb-4">
            {items.length === 0 ? (
              <li className="text-[14px] text-ink-soft">Your cart is empty.</li>
            ) : (
              items.map((i) => {
                const detail = i.contents?.length
                  ? i.contents.map((c) => `${c.qty}× ${c.name}`).join(" · ")
                  : i.product.ingredients.length
                    ? i.product.ingredients.join(" · ")
                    : i.product.description;
                return (
                  <li
                    key={i.product.slug}
                    className="flex justify-between gap-3 text-[14px]"
                  >
                    <span className="min-w-0">
                      <span className="text-ink">
                        {i.product.name} × {i.qty}
                      </span>
                      {detail ? (
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
                          {detail}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0">
                      {formatINR(i.product.priceINR * i.qty)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-ink-soft">Total</span>
          <span className="font-display text-[26px] font-extrabold text-leaf">
            {formatINR(total)}
          </span>
        </div>
      </aside>
    </div>
  );
}
