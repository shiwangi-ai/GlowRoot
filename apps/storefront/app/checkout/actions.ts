"use server";

import {
  addOrder,
  deliverySlots,
  earliestDeliveryDateFor,
  findServiceArea,
  isServiceableWith,
  getBundles,
  getCombos,
  getPlans,
  getProduce,
  getProducts,
  getServiceConfig,
} from "@glowroot/data";
import { randomBytes } from "crypto";
import { resolveSeasonalProduct } from "@glowroot/data/seasonal";
import type {
  BoxContent,
  Customer,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
} from "@glowroot/types";
import { getSessionUser } from "@/lib/session";

export type PaymentInput = {
  method: PaymentMethod;
  /** UPI handle or card number — mock instruments, never stored in full. */
  detail?: string;
  /** Demo switch: makes the mock gateway decline, to exercise the failure path. */
  simulateFailure?: boolean;
};

export type PlaceOrderInput = {
  /**
   * Delivery details for this order. Note the missing `email`: it comes from the
   * session, never from the client, so an order can only ever be created for the
   * signed-in account.
   */
  customer: Omit<Customer, "email">;
  pincode: string;
  deliveryDate: string;
  deliverySlot?: string;
  items: OrderItem[];
  type: "one-time" | "subscription";
  planSlug?: string;
  cycle?: "weekly" | "monthly";
  payment: PaymentInput;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string; stage?: "payment" | "auth" };

const MAX_LINE_QUANTITY = 20;
const MAX_ORDER_ITEMS = 50;

function cleanText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

/** Resolve every cart line against server-owned catalogue and pricing data. */
async function canonicaliseItems(
  submitted: OrderItem[],
): Promise<{ ok: true; items: OrderItem[] } | { ok: false; error: string }> {
  if (!Array.isArray(submitted) || submitted.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (submitted.length > MAX_ORDER_ITEMS) {
    return { ok: false, error: "Your cart has too many separate items." };
  }

  const [products, combos, bundles, produce] = await Promise.all([
    getProducts(),
    getCombos(),
    getBundles(),
    getProduce(),
  ]);
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const comboBySlug = new Map(combos.map((c) => [c.slug, c]));
  const bundleBySlug = new Map(bundles.map((b) => [b.slug, b]));
  const produceBySlug = new Map(produce.map((p) => [`produce-${p.id}`, p]));
  const canonical: OrderItem[] = [];
  let totalUnits = 0;

  for (const line of submitted) {
    if (
      !line ||
      typeof line.productSlug !== "string" ||
      !Number.isInteger(line.qty) ||
      line.qty < 1 ||
      line.qty > MAX_LINE_QUANTITY
    ) {
      return { ok: false, error: "Your cart contains an invalid quantity." };
    }
    totalUnits += line.qty;
    if (totalUnits > MAX_ORDER_ITEMS) {
      return { ok: false, error: "Your cart exceeds the maximum order size." };
    }

    const product = productBySlug.get(line.productSlug);
    if (product) {
      canonical.push({
        productSlug: product.slug,
        qty: line.qty,
        priceINR: product.priceINR,
      });
      continue;
    }

    const combo = comboBySlug.get(line.productSlug);
    if (combo) {
      canonical.push({
        productSlug: combo.slug,
        qty: line.qty,
        priceINR: combo.priceINR,
      });
      continue;
    }

    const produceItem = produceBySlug.get(line.productSlug);
    if (produceItem) {
      const seasonalProduct = resolveSeasonalProduct(produceItem, products);
      canonical.push({
        productSlug: seasonalProduct.slug,
        qty: line.qty,
        priceINR: seasonalProduct.priceINR,
      });
      continue;
    }

    const bundleSlug = line.productSlug.split("::", 1)[0] ?? "";
    const bundle = bundleBySlug.get(bundleSlug);
    if (!bundle || !Array.isArray(line.contents)) {
      return {
        ok: false,
        error: "Your cart contains an item we no longer sell.",
      };
    }

    const seen = new Set<string>();
    const contents: BoxContent[] = [];
    let bottles = 0;
    for (const choice of line.contents) {
      const juice = productBySlug.get(choice?.productSlug);
      if (
        !juice ||
        juice.kind !== "juice" ||
        seen.has(juice.slug) ||
        !Number.isInteger(choice.qty) ||
        choice.qty < 1 ||
        choice.qty > bundle.quantity
      ) {
        return { ok: false, error: "Your box selection is invalid." };
      }
      seen.add(juice.slug);
      bottles += choice.qty;
      contents.push({
        productSlug: juice.slug,
        name: juice.name,
        qty: choice.qty,
      });
    }
    if (bottles !== bundle.quantity) {
      return {
        ok: false,
        error: `The ${bundle.name} must contain exactly ${bundle.quantity} bottles.`,
      };
    }
    const fingerprint = [...contents]
      .sort((a, b) => a.productSlug.localeCompare(b.productSlug))
      .map((c) => `${c.productSlug}-${c.qty}`)
      .join("_");
    canonical.push({
      productSlug: `${bundle.slug}::${fingerprint}`,
      qty: line.qty,
      priceINR: bundle.priceINR,
      contents,
    });
  }

  return { ok: true, items: canonical };
}

/** Mask an instrument down to what's safe to keep on the order. */
function instrumentHint(input: PaymentInput): string | undefined {
  const detail = input.detail?.trim();
  if (!detail) return undefined;
  if (input.method === "card") {
    const digits = detail.replace(/\D/g, "");
    return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : undefined;
  }
  if (input.method === "upi") {
    const [handle, provider] = detail.split("@");
    if (!handle || !provider) return undefined;
    const head = handle.slice(0, 2);
    return `${head}${"•".repeat(Math.max(handle.length - 2, 2))}@${provider}`;
  }
  return undefined;
}

/**
 * Mock payment gateway.
 *
 * Stands in for Razorpay et al. (see docs/user-journey.md Q12): it validates
 * the instrument, "contacts" the provider, and returns a reference. Cash on
 * delivery settles later, so it comes back `pending` rather than `paid`.
 * Replace this function's body with a real gateway call in Phase 4 — the
 * `Payment` it returns is already the shape the order stores.
 */
async function charge(
  input: PaymentInput,
  amountINR: number,
): Promise<{ ok: true; payment: Payment } | { ok: false; error: string }> {
  const reference = `PAY-${randomBytes(6).toString("hex").toUpperCase()}`;

  if (input.method === "cod") {
    return {
      ok: true,
      payment: { method: "cod", status: "pending", reference, amountINR },
    };
  }

  const detail = input.detail?.trim() ?? "";
  if (input.method === "upi" && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(detail)) {
    return { ok: false, error: "Enter a valid UPI ID, e.g. name@bank." };
  }
  if (input.method === "card" && detail.replace(/\D/g, "").length < 12) {
    return { ok: false, error: "Enter a valid card number." };
  }

  // Simulated round-trip, so the UI's "contacting your bank" state is real.
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (input.simulateFailure) {
    return {
      ok: false,
      error:
        "Payment declined by your bank (simulated). Nothing was charged and no order was created — try again or pick another method.",
    };
  }

  return {
    ok: true,
    payment: {
      method: input.method,
      status: "paid",
      reference,
      amountINR,
      instrumentHint: instrumentHint(input),
      paidAt: new Date().toISOString(),
    },
  };
}

/**
 * The full place-an-order path: hard serviceability check → price → payment →
 * persist the order → save the customer's profile for next time.
 *
 * Payment runs *before* the order is written, so a decline leaves nothing
 * behind.
 */
export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  // Identity comes off the server session, not the request body. The UI gates
  // /checkout too, but this is the check that actually holds: the action is a
  // public endpoint, and a caller can no longer name someone else's email.
  const session = await getSessionUser();
  if (!session) {
    return {
      ok: false,
      error: "Please log in with your GlowRoot account to place this order.",
      stage: "auth",
    };
  }

  if (!input || (input.type !== "one-time" && input.type !== "subscription")) {
    return { ok: false, error: "Invalid order type." };
  }

  const name = cleanText(input.customer?.name ?? "", 100);
  const phone = cleanText(input.customer?.phone ?? "", 20);
  const address = cleanText(input.customer?.address ?? "", 300);
  if (!name) return { ok: false, error: "Enter your full name." };
  if (!/^\d{10}$/.test(phone.replace(/\D/g, ""))) {
    return { ok: false, error: "Enter a valid 10-digit phone number." };
  }
  if (address.length < 8) {
    return { ok: false, error: "Enter a complete delivery address." };
  }

  // Everything the client sent about *who* they are is discarded here; only the
  // delivery details survive.
  const customer: Customer = {
    name,
    email: session.email,
    phone,
    address,
  };

  // The hard serviceability check, read from the delivery map the admin
  // manages — the client's copy of it is a hint, this is the decision.
  const pincode = (input.pincode ?? "").trim();
  const serviceConfig = await getServiceConfig();
  const area = findServiceArea(pincode, serviceConfig);
  if (!isServiceableWith(pincode, serviceConfig)) {
    return { ok: false, error: "We can't deliver to that pincode yet." };
  }

  // Lead time is the area's own where there is one, so a two-day area cannot
  // be talked into a next-day slot by a tampered request.
  const earliest = await earliestDeliveryDateFor(
    new Date().toISOString(),
    pincode,
  );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.deliveryDate) ||
    input.deliveryDate < earliest
  ) {
    return {
      ok: false,
      error: `Choose a delivery date on or after ${earliest}.`,
    };
  }
  if (!deliverySlots.some((slot) => slot.label === input.deliverySlot)) {
    return { ok: false, error: "Choose a valid delivery time slot." };
  }

  let items: OrderItem[] = [];
  let totalINR = 0;

  if (input.type === "subscription") {
    if (!input.planSlug) return { ok: false, error: "Missing plan." };
    const plans = await getPlans();
    const plan = plans.find((p) => p.slug === input.planSlug);
    if (!plan) return { ok: false, error: "Unknown plan." };
    const cycle = input.cycle === "monthly" ? "monthly" : "weekly";
    totalINR = plan.pricing[cycle].priceINR;
    items = []; // plan bottles are mix-and-match; not itemised in the mock
  } else {
    const resolved = await canonicaliseItems(input.items);
    if (!resolved.ok) return resolved;
    items = resolved.items;
    totalINR = items.reduce((sum, item) => sum + item.qty * item.priceINR, 0);
  }

  if (!Number.isSafeInteger(totalINR) || totalINR <= 0) {
    return { ok: false, error: "The order total is invalid." };
  }

  if (
    !input.payment ||
    !(["upi", "card", "cod"] as const).includes(input.payment.method)
  ) {
    return { ok: false, error: "Choose a valid payment method." };
  }

  if (input.payment.method === "cod" && area && !area.codEnabled) {
    return {
      ok: false,
      error: `Cash on delivery isn't offered in ${area.area} yet — pick UPI or card.`,
    };
  }

  const charged = await charge(input.payment, totalINR);
  if (!charged.ok) {
    return { ok: false, error: charged.error, stage: "payment" };
  }

  const nowISO = new Date().toISOString();
  const id = `GR-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
  // A completed payment lets us confirm straight away; COD isn't settled yet,
  // so it starts pending.
  const status = charged.payment.status === "paid" ? "confirmed" : "pending";

  const order: Order = {
    id,
    customer,
    items,
    type: input.type,
    planSlug: input.planSlug,
    status,
    totalINR,
    createdAt: nowISO,
    deliveryDate: input.deliveryDate,
    deliverySlot: input.deliverySlot,
    deliveryPincode: pincode,
    payment: charged.payment,
    history: [
      {
        status,
        at: nowISO,
        note:
          charged.payment.status === "paid"
            ? `Payment received · ${charged.payment.reference}`
            : "Order placed · pay on delivery",
      },
    ],
  };

  await addOrder(order);

  return { ok: true, orderId: id };
}
