/** Shared server data access: PostgreSQL customers/orders/sessions and catalogue stores. */
export { getShops, saveShop, type ShopInput } from "./shops";

import type {
  Bundle,
  Combo,
  Customer,
  DeliveryPartner,
  DeliveryPartnerStatus,
  Material,
  Order,
  OrderStatus,
  Plan,
  Product,
  Produce,
  ProduceGroup,
  PublicUser,
  ServiceArea,
  ServiceConfig,
  SessionRole,
  SessionUser,
  User,
} from "@glowroot/types";

import { materials } from "./materials";
export { cancelOrderForCustomer, rescheduleOrderForCustomer } from "./store";
import { readCatalogue } from "./catalogue";
export { saveCatalogueProduct } from "./catalogue";
import { produce } from "./produce";
import { combos, bundles } from "./combos";
import { plans } from "./plans";
import {
  readOrders,
  appendOrder,
  setOrderStatus,
  setOrderPartner,
} from "./store";
import {
  findUser,
  hashPassword,
  registerUser,
  normaliseEmail,
  upsertUserProfile,
  verifyPassword,
} from "./users";
import {
  deleteSession,
  deleteSessionsForEmail,
  findSession,
  insertSession,
} from "./sessions";
import { earliestDeliveryDate, leadDaysFor } from "./serviceability";
import {
  checkPincodeServiceable,
  readServiceAreas,
  readServiceConfig,
} from "./zones";
import { findPartner, readPartners } from "./partners";

// Re-export the raw seed collections for callers that want them directly.
export { materials } from "./materials";
export { products } from "./products";
export { produce } from "./produce";
export { combos, bundles } from "./combos";
export { plans } from "./plans";
export {
  deliverySlots,
  deliveryLeadDays,
  defaultServiceSettings,
  earliestDeliveryDate,
  seedServiceAreas,
  findServiceArea,
  isServiceableWith,
  isValidPincode,
  leadDaysFor,
} from "./serviceability";
export type { DeliverySlot } from "./serviceability";

// Delivery map + roster mutations, straight through to their stores. Admin
// server actions are the only callers; each one throws a message meant for
// the operator, which the action turns into an inline form error.
export {
  createServiceArea,
  deleteServiceArea,
  setNationwideDelivery,
  setServiceAreaActive,
  updateServiceArea,
} from "./zones";
export type { ServiceAreaInput } from "./zones";
export {
  createPartner,
  deletePartner,
  partnerStatuses,
  setPartnerStatus,
  updatePartner,
  vehicleTypes,
} from "./partners";
export type { DeliveryPartnerInput } from "./partners";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  return readCatalogue();
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  return (await readCatalogue()).find((p) => p.slug === slug);
}

export async function getJuices(): Promise<Product[]> {
  return (await readCatalogue()).filter((p) => p.kind === "juice");
}

export async function getSmoothies(): Promise<Product[]> {
  return (await readCatalogue()).filter((p) => p.kind === "smoothie");
}

export async function getShots(): Promise<Product[]> {
  return (await readCatalogue()).filter((p) => p.kind === "shot");
}

// ---------------------------------------------------------------------------
// Produce
// ---------------------------------------------------------------------------

export async function getProduce(group?: ProduceGroup): Promise<Produce[]> {
  return group ? produce.filter((p) => p.group === group) : produce;
}

// ---------------------------------------------------------------------------
// Combos, bundles & plans
// ---------------------------------------------------------------------------

export async function getCombos(): Promise<Combo[]> {
  return combos;
}

export async function getBundles(): Promise<Bundle[]> {
  return bundles;
}

export async function getPlans(): Promise<Plan[]> {
  return plans;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export async function getMaterials(): Promise<Material[]> {
  return materials;
}

export async function getLowStockMaterials(): Promise<Material[]> {
  return materials.filter((m) => m.stock <= m.reorderLevel);
}

// ---------------------------------------------------------------------------
// Orders — PostgreSQL store shared by both apps (see ./store.ts)
// ---------------------------------------------------------------------------

export async function getOrders(): Promise<Order[]> {
  const orders = await readOrders();
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const orders = await readOrders();
  return orders.find((o) => o.id === id);
}

/** Every order placed with a given email, newest first (case-insensitive). */
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const target = email.trim().toLowerCase();
  if (!target) return [];
  const orders = await readOrders();
  return orders
    .filter((o) => o.customer.email.trim().toLowerCase() === target)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * The customer profile for an email. Prefers the user record (kept current by
 * sign-up and every checkout) and falls back to the most recent order, so
 * customers who ordered before the users store existed still resolve.
 */
export async function getCustomerByEmail(
  email: string,
): Promise<Customer | undefined> {
  const user = await findUser(email);
  if (user?.address) {
    return {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
    };
  }
  const orders = await getOrdersByEmail(email);
  return orders[0]?.customer;
}

/**
 * Look up one order for the public tracking page. The email must match the
 * order's own — an order ID alone is guessable, so it isn't a credential.
 */
export async function getOrderForTracking(
  id: string,
  email: string,
): Promise<Order | undefined> {
  const wanted = id.trim().toUpperCase();
  const target = normaliseEmail(email);
  if (!wanted || !target) return undefined;
  const orders = await readOrders();
  return orders.find(
    (o) =>
      o.id.toUpperCase() === wanted &&
      o.customer.email.trim().toLowerCase() === target,
  );
}

export async function addOrder(order: Order): Promise<Order> {
  return appendOrder(order);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order | undefined> {
  return setOrderStatus(id, status);
}

// ---------------------------------------------------------------------------
// Users — PostgreSQL account store (see ./users.ts)
// ---------------------------------------------------------------------------

/** Strip the credential before a user record can reach a client component. */
function toPublic(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function getUserByEmail(
  email: string,
): Promise<PublicUser | undefined> {
  const user = await findUser(email);
  return user ? toPublic(user) : undefined;
}

/**
 * True only for emails with credentials set — a guest-checkout record doesn't
 * count. Checkout uses this to enforce "you must have an account to order"
 * on the server, not just in the UI.
 */
export async function isRegisteredUser(email: string): Promise<boolean> {
  const user = await findUser(email);
  return Boolean(user?.passwordHash);
}

export type CreateUserInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

/**
 * Register an account. An email that already has a password is a conflict; an
 * email known only from a guest checkout gets its credentials filled in, which
 * hands the customer their existing order history on first sign-up.
 */
export async function createUser(
  input: CreateUserInput,
): Promise<{ ok: true; user: PublicUser } | { ok: false; reason: "exists" }> {
  const email = normaliseEmail(input.email);
  const now = new Date().toISOString();
  const user = await registerUser({
    name: input.name.trim(),
    email,
    phone: input.phone?.trim(),
    passwordHash: hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  });
  return user
    ? { ok: true, user: toPublic(user) }
    : { ok: false, reason: "exists" };
}

/**
 * Check credentials. Returns a reason rather than a bare null so the caller can
 * tell "no such account" (offer sign-up) from "wrong password" (offer retry),
 * and "guest record, never registered" from either.
 */
export async function verifyUser(
  email: string,
  password: string,
): Promise<
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "not-found" | "no-password" | "bad-password" }
> {
  const user = await findUser(email);
  if (!user) return { ok: false, reason: "not-found" };
  if (!user.passwordHash) return { ok: false, reason: "no-password" };
  if (!verifyPassword(password, user.passwordHash)) {
    return { ok: false, reason: "bad-password" };
  }
  return { ok: true, user: toPublic(user) };
}

/**
 * Record what checkout collected. Called on every successful order so the next
 * checkout prefills, and so a guest still ends up with a profile they can claim
 * later by signing up with the same email.
 */
export async function saveCustomerProfile(input: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pincode?: string;
}): Promise<PublicUser> {
  const user = await upsertUserProfile({
    ...input,
    nowISO: new Date().toISOString(),
  });
  return toPublic(user);
}

// ---------------------------------------------------------------------------
// Sessions — server-side identity (see ./sessions.ts)
//
// These three accessors are what let a server action stop trusting a
// client-supplied email. The cookie handling itself is app-side (it needs
// `next/headers`); this layer only knows about tokens.
// ---------------------------------------------------------------------------

/** Mint a session. Returns the raw token to put in the cookie. */
export async function createSession(input: {
  email: string;
  role?: SessionRole;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: string }> {
  return insertSession({
    email: normaliseEmail(input.email),
    role: input.role ?? "customer",
    userAgent: input.userAgent,
  });
}

/**
 * Resolve a cookie token to an identity, or `undefined` if it's expired,
 * unknown, or points at an account that no longer holds credentials.
 *
 * The join against the live user record is deliberate: it means profile changes
 * are reflected on the next request, and it means a session survives nothing —
 * deleting the customer database record correctly
 * invalidates every session pointing into it.
 */
export async function readSession(
  token: string,
): Promise<SessionUser | undefined> {
  const session = await findSession(token);
  if (!session) return undefined;

  const user = await findUser(session.email);
  // No record, or a guest record with no credentials — not a valid login.
  if (!user?.passwordHash) return undefined;

  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    pincode: user.pincode,
    role: session.role,
  };
}

/** Log out this browser. */
export async function destroySession(token: string): Promise<void> {
  return deleteSession(token);
}

/** Log out every browser for one account. */
export async function destroyUserSessions(email: string): Promise<void> {
  return deleteSessionsForEmail(normaliseEmail(email));
}

// ---------------------------------------------------------------------------
// Serviceability (the hybrid contract: soft hint while browsing, hard at checkout)
// ---------------------------------------------------------------------------

/** Test a pincode against the live delivery map the admin manages. */
export async function isServiceable(pincode: string): Promise<boolean> {
  return checkPincodeServiceable(pincode);
}

/** The whole delivery map — what the storefront needs to answer for itself. */
export async function getServiceConfig(): Promise<ServiceConfig> {
  return readServiceConfig();
}

/** Service areas for the admin Locations table (city, then pincode). */
export async function getServiceAreas(): Promise<ServiceArea[]> {
  return readServiceAreas();
}

/** Lead-time-aware variant: reads the area record for this pincode. */
export async function earliestDeliveryDateFor(
  fromISO: string,
  pincode: string,
): Promise<string> {
  const config = await readServiceConfig();
  return earliestDeliveryDate(fromISO, leadDaysFor(pincode, config));
}

// ---------------------------------------------------------------------------
// Delivery partners & dispatch
// ---------------------------------------------------------------------------

export async function getDeliveryPartners(): Promise<DeliveryPartner[]> {
  return readPartners();
}

export async function getDeliveryPartnerById(
  id: string,
): Promise<DeliveryPartner | undefined> {
  return findPartner(id);
}

/** A partner plus the live workload the dispatch screens care about. */
export type PartnerWorkload = {
  partner: DeliveryPartner;
  /** Orders assigned and not yet delivered or cancelled. */
  activeOrders: number;
  /** Of those, the ones already out on the road. */
  onRoad: number;
  /** Delivered all time — the roster's "how much have they done" column. */
  delivered: number;
};

/**
 * The dispatch board: every partner joined against the order store.
 *
 * One pass over the orders keeps this cheap enough to call from any page,
 * which is why the admin Delivery screen and the dashboard tile share it.
 */
export async function getPartnerWorkloads(): Promise<PartnerWorkload[]> {
  const [partners, orders] = await Promise.all([readPartners(), readOrders()]);
  return partners.map((partner) => {
    const theirs = orders.filter((o) => o.partnerId === partner.id);
    return {
      partner,
      activeOrders: theirs.filter(
        (o) => o.status !== "delivered" && o.status !== "cancelled",
      ).length,
      onRoad: theirs.filter((o) => o.status === "out-for-delivery").length,
      delivered: theirs.filter((o) => o.status === "delivered").length,
    };
  });
}

/** Live orders that still need someone to carry them. */
export async function getUnassignedOrders(): Promise<Order[]> {
  const orders = await readOrders();
  return orders.filter(
    (o) => !o.partnerId && o.status !== "delivered" && o.status !== "cancelled",
  );
}

/**
 * Assign an order to a delivery partner, or clear the assignment with `null`.
 *
 * Inactive partners are refused — an order handed to someone who has left the
 * roster would silently never move.
 */
export async function assignOrderPartner(
  orderId: string,
  partnerId: string | null,
): Promise<Order | undefined> {
  if (partnerId) {
    const partner = await findPartner(partnerId);
    if (!partner) throw new Error("That delivery partner no longer exists.");
    if (partner.status === "inactive") {
      throw new Error(`${partner.name} is not an active delivery partner.`);
    }
  }
  return setOrderPartner(orderId, partnerId);
}

// ---------------------------------------------------------------------------
// Dashboard helpers (used by the admin KPI tiles)
// ---------------------------------------------------------------------------

export async function getDashboardStats(): Promise<{
  ordersTotal: number;
  ordersActive: number;
  revenueINR: number;
  lowStockCount: number;
  /** Pincodes currently serving, out of every area on the map. */
  areasServing: number;
  areasTotal: number;
  /** Delivery partners free to take a drop right now. */
  partnersAvailable: number;
  partnersTotal: number;
  /** Live orders with nobody carrying them. */
  ordersUnassigned: number;
  ordersOnRoad: number;
}> {
  const [orders, config, partners] = await Promise.all([
    readOrders(),
    readServiceConfig(),
    readPartners(),
  ]);
  const active = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const revenueINR = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalINR, 0);
  return {
    ordersTotal: orders.length,
    ordersActive: active.length,
    revenueINR,
    lowStockCount: materials.filter((m) => m.stock <= m.reorderLevel).length,
    areasServing: config.areas.filter((a) => a.active).length,
    areasTotal: config.areas.length,
    partnersAvailable: partners.filter((p) => p.status === "available").length,
    partnersTotal: partners.filter((p) => p.status !== "inactive").length,
    ordersUnassigned: active.filter((o) => !o.partnerId).length,
    ordersOnRoad: orders.filter((o) => o.status === "out-for-delivery").length,
  };
}
