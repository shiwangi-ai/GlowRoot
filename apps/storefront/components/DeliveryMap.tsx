"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, mapsConfigured } from "../lib/google-maps";

/**
 * Shows where we're delivering, on a real map.
 *
 * Takes the 6-digit pincode the customer typed, asks Google's Geocoder what
 * coordinates it maps to, and drops a pin there. Purely presentational —
 * serviceability is still decided by `@glowroot/data`, never by this map.
 *
 * With no API key configured the component renders nothing, so checkout works
 * exactly as before on a fresh clone.
 */
export function DeliveryMap({ pincode }: { pincode: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "notfound" | "error"
  >("idle");
  const [attempt, setAttempt] = useState(0);
  const [label, setLabel] = useState("");

  const valid = /^\d{6}$/.test(pincode);

  useEffect(() => {
    if (!mapsConfigured || !valid) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      setLabel("");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setLabel("");
    markerRef.current?.setMap(null);

    loadGoogleMaps()
      .then(async (maps) => {
        if (cancelled || !boxRef.current) return;

        // Geocode the pincode. Restricting to India keeps "560034" from
        // matching a postal code somewhere else in the world.
        const geocoder = new maps.Geocoder();
        const { results } = await geocoder.geocode({
          componentRestrictions: { country: "IN", postalCode: pincode },
          fulfillOnZeroResults: true,
        });

        if (cancelled) return;

        const place = results[0];
        if (!place) {
          setStatus("notfound");
          return;
        }
        const position = place.geometry.location;

        // Create the map on first success, then just re-centre it afterwards —
        // rebuilding a Map on every keystroke is what makes these feel janky.
        if (!mapRef.current) {
          mapRef.current = new maps.Map(boxRef.current, {
            center: position,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
          });
        } else {
          mapRef.current.setCenter(position);
          mapRef.current.setZoom(13);
        }

        markerRef.current?.setMap(null);
        markerRef.current = new maps.Marker({
          map: mapRef.current,
          position,
          title: place.formatted_address,
        });

        setLabel(place.formatted_address);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [pincode, valid, attempt]);

  if (!mapsConfigured || !valid) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-[12px] font-semibold text-ink-soft">
        Delivery area preview
      </p>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-line/30">
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-[13px] text-ink-soft">
            {status === "error"
              ? "Map preview unavailable"
              : status === "notfound"
                ? "Pincode not found on the map"
                : "Finding your delivery area…"}
          </div>
        )}
        <div
          ref={boxRef}
          className={`${status !== "ready" ? "invisible " : ""}w-full h-[220px] rounded-2xl border border-line overflow-hidden bg-line/30`}
          aria-label={label ? `Map of ${label}` : "Delivery area map"}
        />
      </div>
      <p aria-live="polite" className="mt-2 text-[12.5px] text-ink-soft">
        {status === "loading" && "Locating…"}
        {status === "ready" && `${label} · Approximate pincode area`}
        {status === "notfound" && "We couldn't place that pincode on the map."}
        {status === "error" && "Map unavailable right now."}
      </p>
      {status === "error" && (
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="mt-2 text-[12px] font-semibold text-leaf underline"
        >
          Retry map
        </button>
      )}
    </div>
  );
}
