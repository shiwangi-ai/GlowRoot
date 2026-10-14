/**
 * The delivery map, as pure data and pure functions.
 *
 * This module is bundled into the browser (the header pincode control and the
 * checkout form both import it), so it must never touch `fs`. The editable,
 * file-backed version of this data lives in `./zones.ts`, which seeds itself
 * from the constants here; the functions below take that config as an argument
 * so the same logic answers "can we deliver here?" on the server and on the
 * client.
 *
 * Delivery-date rules live here too, since checkout is delivery-first for
 * perishable goods: orders respect a press-and-deliver lead time.
 */

import type {
  ServiceArea,
  ServiceConfig,
  ServiceSettings,
} from "@glowroot/types";

export type DeliverySlot = {
  id: string;
  label: string; // "Morning · 6–9am"
};

/** Press-and-deliver lead time in days (earliest deliverable = today + this). */
export const deliveryLeadDays = 1;

/**
 * Network defaults. `nationwide` starts on: we accept any well-formed 6-digit
 * pincode, and the area list below is the curated map of places we know —
 * named areas, per-area lead times and COD availability. Turning it off in
 * the admin narrows serviceability to the active areas only.
 */
export const defaultServiceSettings: ServiceSettings = {
  nationwide: true,
  defaultLeadDays: deliveryLeadDays,
};

/** The starting delivery map. Editable from the admin Locations screen. */
export const seedServiceAreas: ServiceArea[] = [
  area("400020", "Marine Drive", "Mumbai", "Maharashtra", 1),
  area("400049", "Juhu", "Mumbai", "Maharashtra", 1),
  area("400050", "Bandra West", "Mumbai", "Maharashtra", 1),
  area("400053", "Andheri West", "Mumbai", "Maharashtra", 1),
  area("560001", "MG Road", "Bengaluru", "Karnataka", 1),
  area("560034", "Koramangala", "Bengaluru", "Karnataka", 1),
  area("560095", "Koramangala 8th Block", "Bengaluru", "Karnataka", 1),
  area("500034", "Banjara Hills", "Hyderabad", "Telangana", 2),
  area("682011", "Residency Road", "Kochi", "Kerala", 2, false),
];

function area(
  pincode: string,
  name: string,
  city: string,
  state: string,
  leadDays: number,
  codEnabled = true,
): ServiceArea {
  return {
    id: `area-${pincode}`,
    pincode,
    area: name,
    city,
    state,
    active: true,
    leadDays,
    codEnabled,
    createdAt: "2026-08-01T00:00:00+05:30",
  };
}

/** The config the storefront falls back to before the store has been read. */
export const seedServiceConfig: ServiceConfig = {
  ...defaultServiceSettings,
  areas: seedServiceAreas,
};

// ---------------------------------------------------------------------------
// Pure lookups — safe on both sides of the wire
// ---------------------------------------------------------------------------

/** Shape check only: six digits, nothing about whether we deliver there. */
export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}

/** The area record for a pincode, if we have one (paused areas included). */
export function findServiceArea(
  pincode: string,
  config: ServiceConfig,
): ServiceArea | undefined {
  const pin = pincode.trim();
  return config.areas.find((a) => a.pincode === pin);
}

/**
 * The single source of truth for "can we deliver here?", used by the server
 * action, the checkout form and the header banner alike.
 *
 * A named area that has been paused is never serviceable — pausing an area is
 * how the admin stops taking orders somewhere without deleting its record,
 * and that has to hold even while the network is set to nationwide.
 */
export function isServiceableWith(
  pincode: string,
  config: ServiceConfig,
): boolean {
  if (!isValidPincode(pincode)) return false;
  const known = findServiceArea(pincode, config);
  if (known) return known.active;
  return config.nationwide;
}

/** Lead time that applies to a pincode: the area's own, or the fallback. */
export function leadDaysFor(pincode: string, config: ServiceConfig): number {
  return findServiceArea(pincode, config)?.leadDays ?? config.defaultLeadDays;
}

/**
 * Earliest deliverable ISO date given a "today", respecting a lead time.
 * Pure and browser-safe so the checkout form and the server action that
 * validates it can agree on the answer.
 */
export function earliestDeliveryDate(
  fromISO: string,
  leadDays = deliveryLeadDays,
): string {
  const d = new Date(fromISO);
  d.setDate(d.getDate() + leadDays);
  return d.toISOString().slice(0, 10);
}

/** Delivery slots offered at checkout. */
export const deliverySlots: DeliverySlot[] = [
  { id: "early", label: "Early · 5–8am" },
  { id: "morning", label: "Morning · 8–10am" },
  { id: "late-morning", label: "Late morning · 10am–12pm" },
];
