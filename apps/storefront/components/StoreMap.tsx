"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, mapsConfigured } from "../lib/google-maps";
import {
  locateStore,
  storeAddress,
  type StoreLocation,
} from "../lib/store-locations";

// The JavaScript/vector Map ID created for this project in Google Cloud.
const MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() ||
  "f7b20891dabcb4eb3b24db33";
type State = {
  shopId: string;
  status: "loading" | "ready" | "error" | "notfound";
  approximate?: boolean;
};

export function StoreMap({ shop }: { shop: StoreLocation }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const cache = useRef(
    new Map<string, NonNullable<Awaited<ReturnType<typeof locateStore>>>>(),
  );
  const [state, setState] = useState<State>({
    shopId: shop.id,
    status: "loading",
  });
  const [attempt, setAttempt] = useState(0);
  const current =
    state.shopId === shop.id
      ? state
      : ({ shopId: shop.id, status: "loading" } as State);

  useEffect(() => {
    if (!mapsConfigured) return;
    let cancelled = false;
    let marker: google.maps.marker.AdvancedMarkerElement | undefined;
    let listener: google.maps.MapsEventListener | undefined;
    let info: google.maps.InfoWindow | undefined;
    setState({ shopId: shop.id, status: "loading" });

    async function showShop() {
      const maps = await loadGoogleMaps();
      if (cancelled || !host.current) return;
      const { AdvancedMarkerElement } = (await maps.importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;
      if (cancelled || !host.current) return;
      const key = storeAddress(shop);
      const location =
        cache.current.get(key) ??
        (await locateStore(new maps.Geocoder(), shop));
      if (cancelled || !host.current) return;
      if (!location) {
        setState({ shopId: shop.id, status: "notfound" });
        return;
      }
      cache.current.set(key, location);
      if (!map.current) {
        map.current = new maps.Map(host.current, {
          mapId: MAP_ID,
          center: location.position,
          zoom: location.approximate ? 13 : 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
      } else {
        map.current.setCenter(location.position);
        map.current.setZoom(location.approximate ? 13 : 16);
      }

      const content = document.createElement("div");
      content.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:4px;filter:drop-shadow(0 3px 5px #163c2433)";
      const label = document.createElement("span");
      label.textContent = location.approximate
        ? "GlowRoot · approximate area"
        : "GlowRoot";
      label.style.cssText =
        "background:#fff;color:#245536;border:1px solid #dbe7d5;border-radius:20px;padding:6px 12px;font:700 13px Arial,sans-serif;white-space:nowrap";
      const icon = document.createElement("img");
      icon.src = "/assets/glowroot-store-marker.svg";
      icon.width = 56;
      icon.height = 66;
      icon.alt = "";
      content.append(label, icon);
      marker = new AdvancedMarkerElement({
        map: map.current,
        position: location.position,
        title: `${shop.name}${location.approximate ? " — approximate pincode area" : ""}`,
        content,
      });
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = shop.name;
      const address = document.createElement("p");
      address.textContent = storeAddress(shop);
      details.append(name, address);
      if (location.approximate) {
        const note = document.createElement("p");
        note.textContent =
          "Approximate pincode area. Confirm the street address before visiting.";
        details.append(note);
      }
      info = new maps.InfoWindow({ content: details });
      listener = marker.addListener("click", () =>
        info?.open({ map: map.current!, anchor: marker }),
      );
      setState({
        shopId: shop.id,
        status: "ready",
        approximate: location.approximate,
      });
    }

    void showShop().catch(() => {
      if (!cancelled) setState({ shopId: shop.id, status: "error" });
    });
    return () => {
      cancelled = true;
      listener?.remove();
      info?.close();
      if (marker) marker.map = null;
    };
  }, [shop, attempt]);

  const ready = mapsConfigured && current.status === "ready";
  return (
    <div>
      <div className="relative h-[320px] sm:h-[400px] bg-leaf/5">
        <div
          ref={host}
          aria-label={`Map showing ${shop.name}`}
          className={`h-full w-full ${ready ? "" : "invisible"}`}
        />
        {!ready && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center text-ink-soft"
          >
            <p>
              {!mapsConfigured
                ? "Map unavailable. You can still view store details and get directions below."
                : current.status === "notfound"
                  ? "We couldn't locate this store on the map. Check the address below."
                  : current.status === "error"
                    ? "The map couldn't load. Please try again."
                    : `Finding ${shop.name}…`}
            </p>
            {mapsConfigured &&
              (current.status === "error" || current.status === "notfound") && (
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="font-semibold text-leaf underline"
                >
                  Retry map
                </button>
              )}
          </div>
        )}
      </div>
      {ready && (
        <p
          role="status"
          className="border-b border-line px-5 py-3 text-xs text-ink-soft"
        >
          {current.approximate
            ? "Approximate pincode area — confirm the street address before visiting."
            : "Location based on the saved store address."}
        </p>
      )}
    </div>
  );
}
