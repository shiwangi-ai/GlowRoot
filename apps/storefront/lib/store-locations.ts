import type { Shop } from "@glowroot/types";

export type StoreLocation = Pick<
  Shop,
  "id" | "name" | "address" | "city" | "pincode" | "phone"
>;

export function matchesStore(shop: StoreLocation, query: string): boolean {
  const text =
    `GlowRoot ${shop.name} ${shop.address} ${shop.city} ${shop.pincode}`.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

export function storeAddress(shop: StoreLocation): string {
  return `${shop.address}, ${shop.city}, ${shop.pincode}, India`;
}

export async function locateStore(
  geocoder: google.maps.Geocoder,
  shop: StoreLocation,
): Promise<{ position: google.maps.LatLng; approximate: boolean } | null> {
  const { results } = await geocoder.geocode({
    address: storeAddress(shop),
    componentRestrictions: { country: "IN", postalCode: shop.pincode },
    fulfillOnZeroResults: true,
  });
  const exact = results.find(
    (result) =>
      !result.partial_match &&
      ["ROOFTOP", "RANGE_INTERPOLATED"].includes(
        result.geometry.location_type,
      ) &&
      result.address_components.some(
        (part) =>
          part.types.includes("postal_code") && part.long_name === shop.pincode,
      ),
  );
  if (exact) return { position: exact.geometry.location, approximate: false };

  // Incomplete saved addresses must never look like verified shop positions.
  const area = await geocoder.geocode({
    componentRestrictions: { country: "IN", postalCode: shop.pincode },
    fulfillOnZeroResults: true,
  });
  return area.results[0]
    ? { position: area.results[0].geometry.location, approximate: true }
    : null;
}
