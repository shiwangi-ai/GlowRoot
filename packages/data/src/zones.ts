/**
 * File-backed delivery-map store (Node runtime only).
 *
 * The admin Locations screen writes here; the storefront reads it to decide
 * what to say about a pincode. It is the editable counterpart to the constants
 * in `./serviceability.ts`, which seed it on first run and stay the browser-safe
 * half of the pair.
 *
 * Never import this from a client component; it uses `fs`.
 */
import { promises as fs } from "fs";
import type { ServiceArea, ServiceConfig } from "@glowroot/types";
import { dataFile } from "./repo-root";
import {
  defaultServiceSettings,
  isServiceableWith,
  isValidPincode,
  seedServiceAreas,
} from "./serviceability";

const FILE = ".glowroot-zones.json";

/** Input for creating or editing an area; ids and timestamps are ours. */
export type ServiceAreaInput = {
  pincode: string;
  area: string;
  city: string;
  state: string;
  leadDays: number;
  codEnabled: boolean;
  active?: boolean;
  notes?: string;
};

async function load(): Promise<ServiceConfig> {
  try {
    const raw = await fs.readFile(dataFile(FILE), "utf8");
    const parsed = JSON.parse(raw) as Partial<ServiceConfig>;
    return {
      nationwide: parsed.nationwide ?? defaultServiceSettings.nationwide,
      defaultLeadDays:
        parsed.defaultLeadDays ?? defaultServiceSettings.defaultLeadDays,
      areas: parsed.areas ?? [],
    };
  } catch {
    // first run — seed the file so both apps start from the same map
    const seeded: ServiceConfig = {
      ...defaultServiceSettings,
      areas: [...seedServiceAreas],
    };
    await save(seeded);
    return seeded;
  }
}

async function save(config: ServiceConfig): Promise<void> {
  await fs.writeFile(dataFile(FILE), JSON.stringify(config, null, 2), "utf8");
}

/** Everything the storefront and admin need about the delivery map. */
export async function readServiceConfig(): Promise<ServiceConfig> {
  return load();
}

/** Areas sorted the way the admin table wants them: by city, then pincode. */
export async function readServiceAreas(): Promise<ServiceArea[]> {
  const { areas } = await load();
  return [...areas].sort(
    (a, b) =>
      a.city.localeCompare(b.city) || a.pincode.localeCompare(b.pincode),
  );
}

/** The live serviceability answer, straight from the store. */
export async function checkPincodeServiceable(
  pincode: string,
): Promise<boolean> {
  return isServiceableWith(pincode, await load());
}

/** Flip between nationwide delivery and the curated-areas-only map. */
export async function setNationwideDelivery(
  on: boolean,
): Promise<ServiceConfig> {
  const config = await load();
  config.nationwide = on;
  await save(config);
  return config;
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Shared field validation. Throws with a message meant for the operator —
 * the admin action turns it into an inline form error.
 */
function validate(input: ServiceAreaInput, areas: ServiceArea[], id?: string) {
  const pincode = input.pincode.replace(/\D/g, "");
  if (!isValidPincode(pincode))
    throw new Error("Enter a valid 6-digit pincode.");

  const clash = areas.find((a) => a.pincode === pincode && a.id !== id);
  if (clash) {
    throw new Error(
      `${pincode} is already on the map as ${clash.area}, ${clash.city}.`,
    );
  }

  const area = clean(input.area, 60);
  const city = clean(input.city, 60);
  const state = clean(input.state, 60);
  if (!area) throw new Error("Enter the area or locality name.");
  if (!city) throw new Error("Enter the city.");
  if (!state) throw new Error("Enter the state.");

  const leadDays = Number(input.leadDays);
  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 7) {
    throw new Error(
      "Lead time must be a whole number of days between 0 and 7.",
    );
  }

  return {
    pincode,
    area,
    city,
    state,
    leadDays,
    codEnabled: Boolean(input.codEnabled),
    notes: input.notes ? clean(input.notes, 200) : undefined,
  };
}

export async function createServiceArea(
  input: ServiceAreaInput,
): Promise<ServiceArea> {
  const config = await load();
  const fields = validate(input, config.areas);
  const record: ServiceArea = {
    id: `area-${fields.pincode}-${Date.now().toString(36)}`,
    ...fields,
    active: input.active ?? true,
    createdAt: new Date().toISOString(),
  };
  config.areas.push(record);
  await save(config);
  return record;
}

export async function updateServiceArea(
  id: string,
  input: ServiceAreaInput,
): Promise<ServiceArea> {
  const config = await load();
  const existing = config.areas.find((a) => a.id === id);
  if (!existing) throw new Error("That service area no longer exists.");
  const fields = validate(input, config.areas, id);
  Object.assign(existing, fields, { active: input.active ?? existing.active });
  await save(config);
  return existing;
}

/** Pause or resume an area without losing its record. */
export async function setServiceAreaActive(
  id: string,
  active: boolean,
): Promise<ServiceArea> {
  const config = await load();
  const existing = config.areas.find((a) => a.id === id);
  if (!existing) throw new Error("That service area no longer exists.");
  existing.active = active;
  await save(config);
  return existing;
}

export async function deleteServiceArea(id: string): Promise<void> {
  const config = await load();
  const next = config.areas.filter((a) => a.id !== id);
  if (next.length === config.areas.length) {
    throw new Error("That service area no longer exists.");
  }
  config.areas = next;
  await save(config);
}
