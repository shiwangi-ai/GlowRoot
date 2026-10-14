/**
 * File-backed delivery-partner roster (Node runtime only).
 *
 * The people who carry the boxes: who is on the roster, which pincodes they
 * cover, and whether they are free right now. The admin Delivery screen writes
 * here and order dispatch reads it.
 *
 * Never import this from a client component; it uses `fs`.
 */
import { promises as fs } from "fs";
import type {
  DeliveryPartner,
  DeliveryPartnerStatus,
  VehicleType,
} from "@glowroot/types";
import { dataFile } from "./repo-root";
import { isValidPincode } from "./serviceability";

const FILE = ".glowroot-partners.json";

export const vehicleTypes: VehicleType[] = ["cycle", "bike", "scooter", "van"];

export const partnerStatuses: DeliveryPartnerStatus[] = [
  "available",
  "on-route",
  "off-duty",
  "inactive",
];

export type DeliveryPartnerInput = {
  name: string;
  phone: string;
  vehicle: VehicleType;
  vehicleNumber?: string;
  zones: string[];
  capacityPerSlot: number;
  status?: DeliveryPartnerStatus;
  notes?: string;
};

/** The starting roster, covering the seeded service areas. */
export const seedPartners: DeliveryPartner[] = [
  {
    id: "DP-1001",
    name: "Imran Qureshi",
    phone: "9820011223",
    vehicle: "bike",
    vehicleNumber: "MH 02 CJ 4417",
    zones: ["400020", "400049", "400050"],
    status: "on-route",
    capacityPerSlot: 12,
    joinedAt: "2026-03-14T09:00:00+05:30",
    notes: "Knows the Juhu lanes; fastest on the early slot.",
  },
  {
    id: "DP-1002",
    name: "Sneha Kulkarni",
    phone: "9821144556",
    vehicle: "scooter",
    vehicleNumber: "MH 01 AB 9032",
    zones: ["400050", "400053"],
    status: "available",
    capacityPerSlot: 10,
    joinedAt: "2026-04-02T09:00:00+05:30",
  },
  {
    id: "DP-1003",
    name: "Arun Prakash",
    phone: "9880022114",
    vehicle: "bike",
    vehicleNumber: "KA 05 HH 2210",
    zones: ["560001", "560034", "560095"],
    status: "available",
    capacityPerSlot: 14,
    joinedAt: "2026-02-20T09:00:00+05:30",
  },
  {
    id: "DP-1004",
    name: "Lakshmi Reddy",
    phone: "9848033220",
    vehicle: "scooter",
    vehicleNumber: "TS 09 EK 7781",
    zones: ["500034"],
    status: "available",
    capacityPerSlot: 9,
    joinedAt: "2026-05-11T09:00:00+05:30",
  },
  {
    id: "DP-1005",
    name: "Joseph Mathew",
    phone: "9847066332",
    vehicle: "van",
    vehicleNumber: "KL 07 BX 1145",
    zones: ["682011"],
    status: "off-duty",
    capacityPerSlot: 20,
    joinedAt: "2026-06-08T09:00:00+05:30",
    notes: "Runs the Kochi bulk drop; van doubles as the cold box.",
  },
  {
    id: "DP-1006",
    name: "Rahul Yadav",
    phone: "9821277889",
    vehicle: "cycle",
    zones: ["400049", "400053"],
    status: "available",
    capacityPerSlot: 6,
    joinedAt: "2026-07-19T09:00:00+05:30",
    notes: "Short-radius cycle runs, weekends only.",
  },
];

async function load(): Promise<DeliveryPartner[]> {
  try {
    const raw = await fs.readFile(dataFile(FILE), "utf8");
    return JSON.parse(raw) as DeliveryPartner[];
  } catch {
    // first run — seed the file so both apps start from the same roster
    await save([...seedPartners]);
    return [...seedPartners];
  }
}

async function save(partners: DeliveryPartner[]): Promise<void> {
  await fs.writeFile(dataFile(FILE), JSON.stringify(partners, null, 2), "utf8");
}

export async function readPartners(): Promise<DeliveryPartner[]> {
  const partners = await load();
  return [...partners].sort((a, b) => a.name.localeCompare(b.name));
}

export async function findPartner(
  id: string,
): Promise<DeliveryPartner | undefined> {
  return (await load()).find((p) => p.id === id);
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Shared field validation; messages are written for the operator. */
function validate(input: DeliveryPartnerInput) {
  const name = clean(input.name, 60);
  if (name.length < 2) throw new Error("Enter the partner's full name.");

  const phone = input.phone.replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone)) {
    throw new Error("Enter a valid 10-digit phone number.");
  }

  if (!vehicleTypes.includes(input.vehicle)) {
    throw new Error("Choose a vehicle type.");
  }

  const zones = Array.from(
    new Set(input.zones.map((z) => z.replace(/\D/g, "")).filter(Boolean)),
  );
  if (zones.length === 0)
    throw new Error("Assign at least one pincode to cover.");
  const bad = zones.find((z) => !isValidPincode(z));
  if (bad) throw new Error(`"${bad}" is not a valid 6-digit pincode.`);

  const capacityPerSlot = Number(input.capacityPerSlot);
  if (
    !Number.isInteger(capacityPerSlot) ||
    capacityPerSlot < 1 ||
    capacityPerSlot > 40
  ) {
    throw new Error("Capacity must be between 1 and 40 orders per slot.");
  }

  return {
    name,
    phone,
    vehicle: input.vehicle,
    vehicleNumber: input.vehicleNumber
      ? clean(input.vehicleNumber, 20).toUpperCase()
      : undefined,
    zones: zones.sort(),
    capacityPerSlot,
    notes: input.notes ? clean(input.notes, 200) : undefined,
  };
}

/** Sequential, human-readable ids — easier to say out loud than a hash. */
function nextId(partners: DeliveryPartner[]): string {
  const highest = partners.reduce((max, p) => {
    const n = Number(p.id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
  return `DP-${highest + 1}`;
}

export async function createPartner(
  input: DeliveryPartnerInput,
): Promise<DeliveryPartner> {
  const partners = await load();
  const fields = validate(input);
  if (partners.some((p) => p.phone === fields.phone)) {
    throw new Error(
      "A partner with that phone number is already on the roster.",
    );
  }
  const record: DeliveryPartner = {
    id: nextId(partners),
    ...fields,
    status: input.status ?? "available",
    joinedAt: new Date().toISOString(),
  };
  partners.push(record);
  await save(partners);
  return record;
}

export async function updatePartner(
  id: string,
  input: DeliveryPartnerInput,
): Promise<DeliveryPartner> {
  const partners = await load();
  const existing = partners.find((p) => p.id === id);
  if (!existing) throw new Error("That delivery partner no longer exists.");
  const fields = validate(input);
  if (partners.some((p) => p.phone === fields.phone && p.id !== id)) {
    throw new Error(
      "A partner with that phone number is already on the roster.",
    );
  }
  Object.assign(existing, fields, { status: input.status ?? existing.status });
  await save(partners);
  return existing;
}

export async function setPartnerStatus(
  id: string,
  status: DeliveryPartnerStatus,
): Promise<DeliveryPartner> {
  if (!partnerStatuses.includes(status))
    throw new Error("Unknown partner status.");
  const partners = await load();
  const existing = partners.find((p) => p.id === id);
  if (!existing) throw new Error("That delivery partner no longer exists.");
  existing.status = status;
  await save(partners);
  return existing;
}

export async function deletePartner(id: string): Promise<void> {
  const partners = await load();
  const next = partners.filter((p) => p.id !== id);
  if (next.length === partners.length) {
    throw new Error("That delivery partner no longer exists.");
  }
  await save(next);
}
