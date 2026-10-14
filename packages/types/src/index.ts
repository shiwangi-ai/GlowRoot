/**
 * GlowRoot shared domain model.
 *
 * These types are the contract between the storefront, the admin app and the
 * data layer. When a real backend replaces `@glowroot/data`'s mock
 * implementation, these types stay exactly the same.
 */

// ---------------------------------------------------------------------------
// Products — a finished thing a customer buys
// ---------------------------------------------------------------------------

export type ProductKind = "juice" | "smoothie" | "shot";
export type Season = "summer" | "winter" | "all";

/** Links a product to the raw materials it consumes (bill of materials). */
export type RecipeItem = {
  materialId: string;
  grams: number;
};

export type Product = {
  slug: string;
  name: string; // "Summer Crush"
  kind: ProductKind;
  priceINR: number; // 180
  volumeMl: number; // 100 / 250
  ingredients: string[]; // ["Watermelon", "Strawberry", "Lime", "Mint"]
  description: string;
  imageUrl: string;
  tags: string[]; // ["Peak season", "Bestseller"]
  season?: Season;
  recipe: RecipeItem[]; // raw MATERIALS this product consumes
};

// ---------------------------------------------------------------------------
// Materials — raw produce tracked on the admin side
// ---------------------------------------------------------------------------

export type MaterialCategory = "fruit" | "vegetable" | "other";
export type MaterialUnit = "kg" | "g" | "litre";

export type Material = {
  id: string; // "mango"
  name: string; // "Mango (Alphonso)"
  category: MaterialCategory;
  unit: MaterialUnit;
  stock: number; // current inventory
  reorderLevel: number; // alert threshold
  costPerUnitINR: number;
};

// ---------------------------------------------------------------------------
// Produce — the seasonal fruit & vegetable showcase on the storefront
// ---------------------------------------------------------------------------

export type ProduceGroup = "fruit" | "veg-single" | "veg-blend";

export type Produce = {
  id: string;
  name: string;
  note: string; // "Alphonso, pressed at peak ripeness"
  tag: string; // "Peak season"
  group: ProduceGroup;
  imageUrl: string;
  /** The two-stop radial gradient used behind the produce ring. */
  ring: { from: string; to: string };
};

// ---------------------------------------------------------------------------
// Combos — one-time bundles / gift boxes
// ---------------------------------------------------------------------------

export type Combo = {
  slug: string;
  name: string;
  itemSlugs: string[]; // products included
  priceINR: number;
  wasPriceINR?: number;
  quantity: number; // 3 / 6 / 12
};

/** A bundle-picker card (Sampler / Sharing / Gift). */
export type Bundle = {
  slug: string;
  name: string;
  quantity: number;
  qtyLabel: string; // "3 bottles · one-time"
  description: string;
  priceINR: number;
  perBottleINR: number;
  featured?: boolean;
  pickLabel?: string; // "Best for sharing"
  ctaVariant: "primary" | "ghost";
  ctaLabel: string;
};

// ---------------------------------------------------------------------------
// Plans — subscription plans (the weekly/monthly toggle)
// ---------------------------------------------------------------------------

export type BillingCycle = "weekly" | "monthly";

export type Plan = {
  slug: string;
  name: string;
  blurb: string;
  bottlesPerDelivery: number;
  pricing: {
    weekly: { priceINR: number; bottles: number; perBottleINR: number };
    monthly: { priceINR: number; bottles: number; perBottleINR: number };
  };
  perks: string[];
  featured?: boolean;
};

// ---------------------------------------------------------------------------
// Orders — the thing the admin tracks
// ---------------------------------------------------------------------------

export type OrderType = "one-time" | "subscription";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "pressing"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

/** One juice inside a build-your-own box (Sampler / Sharing). */
export type BoxContent = {
  productSlug: string;
  name: string; // "Green Roots" — denormalised for display without a lookup
  qty: number;
};

export type OrderItem = {
  productSlug: string;
  qty: number;
  priceINR: number;
  /** For build-your-own boxes: the juices the customer chose. */
  contents?: BoxContent[];
};

export type Customer = {
  name: string;
  email: string;
  phone?: string;
  address: string;
};

// ---------------------------------------------------------------------------
// Payment — mocked in this phase, shaped for a real gateway later
// ---------------------------------------------------------------------------

export type PaymentMethod = "upi" | "card" | "cod";

export type PaymentStatus =
  | "paid"
  | "pending" // cash on delivery — collected at the door
  | "failed";

export type Payment = {
  method: PaymentMethod;
  status: PaymentStatus;
  /** Gateway reference. Mock-generated now, provider-issued in Phase 4. */
  reference: string;
  amountINR: number;
  /** Last four digits / masked UPI handle — never the full instrument. */
  instrumentHint?: string;
  paidAt?: string; // ISO date; absent while pending or failed
};

/** One step in an order's life, for the customer-facing tracking timeline. */
export type OrderEvent = {
  status: OrderStatus;
  at: string; // ISO date
  note?: string;
  /** Delivery date change; does not advance the preparation status. */
  deliveryChange?: { from: string; to: string };
};

export type Order = {
  id: string;
  customer: Customer;
  items: OrderItem[];
  type: OrderType;
  planSlug?: string;
  status: OrderStatus;
  totalINR: number;
  createdAt: string; // ISO date
  deliveryDate: string; // ISO date
  deliverySlot?: string; // e.g. "Morning · 6–9am"
  /** The pincode this order delivers to — what fulfilment routes on. */
  deliveryPincode?: string;
  /** Delivery partner carrying this order, once dispatch assigns one. */
  partnerId?: string;
  payment?: Payment;
  /** Append-only status trail. Absent on seed orders placed before tracking. */
  history?: OrderEvent[];
};

// ---------------------------------------------------------------------------
// Service areas — the delivery map the admin curates
// ---------------------------------------------------------------------------

/**
 * One pincode we press-and-deliver to. Managed from the admin Locations screen
 * and read by the storefront for the serviceability hint and the hard checkout
 * check, so a change here is visible to customers immediately.
 */
export type ServiceArea = {
  id: string;
  pincode: string; // six digits; unique across areas
  area: string; // "Bandra West"
  city: string; // "Mumbai"
  state: string; // "Maharashtra"
  /** Paused areas keep their history but stop accepting orders. */
  active: boolean;
  /** Press-and-deliver lead time for this area, in days. */
  leadDays: number;
  /** Cash on delivery offered here. */
  codEnabled: boolean;
  notes?: string;
  createdAt: string; // ISO date
};

/**
 * Delivery-network settings that sit above the individual areas.
 * `nationwide` is the switch between "we ship to any valid pincode" and
 * "only the listed areas are serviceable".
 */
export type ServiceSettings = {
  nationwide: boolean;
  /** Fallback lead time for pincodes with no area record of their own. */
  defaultLeadDays: number;
};

/** Everything the storefront needs to answer "can we deliver here?". */
export type ServiceConfig = ServiceSettings & { areas: ServiceArea[] };

/** A physical shop and the existing delivery areas assigned to it. */
export type Shop = {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  areaIds: string[];
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Delivery partners — the people who actually carry the boxes
// ---------------------------------------------------------------------------

export type VehicleType = "cycle" | "bike" | "scooter" | "van";

export type DeliveryPartnerStatus =
  | "available" // on the roster and free to take drops
  | "on-route" // currently out delivering
  | "off-duty" // rostered but not working right now
  | "inactive"; // no longer with us

export type DeliveryPartner = {
  id: string; // "DP-1004"
  name: string;
  phone: string;
  vehicle: VehicleType;
  vehicleNumber?: string;
  /** Pincodes this partner covers — matched against an order's pincode. */
  zones: string[];
  status: DeliveryPartnerStatus;
  /** How many orders they can carry in one delivery slot. */
  capacityPerSlot: number;
  joinedAt: string; // ISO date
  notes?: string;
};

// ---------------------------------------------------------------------------
// Users — the persisted account behind a session
// ---------------------------------------------------------------------------

/**
 * A registered customer. `passwordHash` is a salted PBKDF2 digest produced by
 * the data layer — plaintext passwords never leave the sign-up action, and the
 * hash never leaves the server.
 */
export type User = {
  name: string;
  email: string; // lowercased; the primary key
  phone?: string;
  address?: string;
  /** Last pincode they ordered to, so checkout can prefill it. */
  pincode?: string;
  passwordHash: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
};

/** A user with the secret stripped — the only shape that reaches a client. */
export type PublicUser = Omit<User, "passwordHash">;

// ---------------------------------------------------------------------------
// Sessions — server-side identity, carried by an HTTP-only cookie
// ---------------------------------------------------------------------------

/**
 * Who a session belongs to. Customers sign in on the storefront; `staff` is
 * reserved for the admin app, which has no auth yet (Step 3).
 */
export type SessionRole = "customer" | "staff";

/**
 * A stored session. The cookie carries an opaque random token; only its SHA-256
 * digest is persisted, so a leaked store can't be replayed as a login.
 *
 * Keyed by `email` because that is still the user primary key. When Postgres
 * lands this becomes a `userId` foreign key and nothing else about the flow
 * changes.
 */
export type SessionRecord = {
  tokenHash: string;
  email: string;
  role: SessionRole;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date
  userAgent?: string;
};

/**
 * The identity a signed-in request resolves to: the session joined against the
 * live user record, so profile edits show up immediately instead of going stale
 * in a client-held copy.
 */
export type SessionUser = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pincode?: string;
  role: SessionRole;
};
