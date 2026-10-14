"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, mapsConfigured } from "@/lib/google-maps";

export type SelectedLocation = {
  pincode: string;
  area: string;
  city: string;
  state: string;
  formattedAddress: string;
};

function component(
  components: google.maps.places.AddressComponent[] | undefined,
  ...types: string[]
) {
  return components?.find((item) =>
    types.some((type) => item.types.includes(type)),
  );
}

/** Google Places search that turns a selection into our delivery-area fields. */
export function LocationSearch({
  onSelect,
}: {
  onSelect: (location: SelectedLocation) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!mapsConfigured || !hostRef.current) return;

    let cancelled = false;
    let widget: google.maps.places.PlaceAutocompleteElement | null = null;

    loadGoogleMaps()
      .then(async (maps) => {
        const { PlaceAutocompleteElement } = (await maps.importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;
        if (cancelled || !hostRef.current) return;

        widget = new PlaceAutocompleteElement();
        widget.includedRegionCodes = ["in"];
        widget.placeholder = "Search locality, landmark, address or pincode";
        widget.setAttribute(
          "aria-label",
          "Search for an Indian delivery location",
        );
        widget.className = "location-autocomplete";

        const handleSelect = async (rawEvent: Event) => {
          const event =
            rawEvent as google.maps.places.PlacePredictionSelectEvent;
          const place = event.placePrediction.toPlace();
          try {
            await place.fetchFields({
              fields: ["addressComponents", "formattedAddress", "displayName"],
            });
            const parts = place.addressComponents;
            const postal = component(parts, "postal_code")?.longText ?? "";
            const area =
              component(
                parts,
                "sublocality_level_1",
                "sublocality",
                "neighborhood",
              )?.longText ??
              place.displayName ??
              "";
            const city =
              component(parts, "locality", "postal_town")?.longText ??
              component(parts, "administrative_area_level_2")?.longText ??
              "";
            const state =
              component(parts, "administrative_area_level_1")?.longText ?? "";

            onSelectRef.current({
              pincode: postal.replace(/\D/g, "").slice(0, 6),
              area,
              city,
              state,
              formattedAddress: place.formattedAddress ?? "",
            });
          } catch {
            setStatus("error");
          }
        };

        widget.addEventListener("gmp-select", handleSelect);
        hostRef.current.replaceChildren(widget);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      widget?.remove();
    };
  }, []);

  if (!mapsConfigured) {
    return (
      <div className="rounded-xl border border-line bg-cream px-3.5 py-3 text-[12.5px] text-ink-soft">
        Google location search is not configured. You can still enter the
        location manually.
      </div>
    );
  }

  return (
    <div>
      <div ref={hostRef} className="min-h-[48px]" />
      {status === "loading" ? (
        <p className="mt-1.5 text-[12px] text-ink-soft">
          Loading location search…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mt-1.5 text-[12px] text-carrot">
          Google location search is unavailable. Enter the fields manually
          below.
        </p>
      ) : null}
    </div>
  );
}
