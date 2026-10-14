"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadGoogleMaps, mapsConfigured } from "@/lib/google-maps";
import { humanize } from "@glowroot/utils";

export type DeliveryStop = {
  id: string;
  address: string;
  pincode: string;
  status: string;
  partner: string;
};

function destination(stop: DeliveryStop) {
  return [stop.address, stop.pincode, "India"].filter(Boolean).join(", ");
}

function AddressMap({ stop }: { stop: DeliveryStop }) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Locating delivery address…");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let marker: google.maps.Marker | undefined;
    setReady(false);
    setStatus("Locating delivery address…");
    loadGoogleMaps()
      .then(async (maps) => {
        const { results } = await new maps.Geocoder().geocode({
          address: destination(stop),
          componentRestrictions: { country: "IN" },
          fulfillOnZeroResults: true,
        });
        if (cancelled || !ref.current) return;
        const result = results[0];
        if (!result) {
          setStatus(
            "Address could not be located. Open directions to search in Google Maps.",
          );
          return;
        }
        const map = new maps.Map(ref.current, {
          center: result.geometry.location,
          zoom: stop.address ? 16 : 13,
          disableDefaultUI: true,
          zoomControl: true,
        });
        marker = new maps.Marker({
          map,
          position: result.geometry.location,
          title: stop.id,
        });
        setReady(true);
        setStatus(
          stop.address
            ? "Approximate address match — confirm the delivery address before travelling."
            : "Pincode area only — no street address is on file.",
        );
      })
      .catch(() => {
        if (!cancelled)
          setStatus(
            "Map unavailable. You can still open directions in Google Maps.",
          );
      });
    return () => {
      cancelled = true;
      marker?.setMap(null);
    };
  }, [stop, attempt]);

  return (
    <div>
      <div
        ref={ref}
        aria-label={`Delivery address map for ${stop.id}`}
        className={`h-[300px] w-full rounded-xl bg-cream-2 ${ready ? "" : "invisible"}`}
      />
      <p role="status" className="mt-2 text-[12px] text-ink-soft">
        {status}
      </p>
      {!ready && !status.startsWith("Locating") ? (
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="mt-2 text-[13px] text-leaf underline"
        >
          Retry map
        </button>
      ) : null}
    </div>
  );
}

export function DeliveryOrderMap({ stops }: { stops: DeliveryStop[] }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = stops.find((stop) => stop.id === selectedId) ?? stops[0];
  return (
    <section className="mt-6 rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-display text-[17px]">Delivery addresses</h2>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        Choose an active order to preview its destination and open navigation.
      </p>
      {!selected ? (
        <p className="mt-4 text-[14px] text-ink-soft">
          No active deliveries to show.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[300px_1fr]">
          <div>
            <label
              htmlFor="delivery-map-order"
              className="text-[13px] font-semibold"
            >
              Order
            </label>
            <select
              id="delivery-map-order"
              value={selected.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-cream p-3 text-[13px]"
            >
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.id} · {stop.pincode || "No pincode"}
                </option>
              ))}
            </select>
            <p className="mt-4 text-[14px]">
              {selected.address || "Street address not provided"}
            </p>
            <p className="mt-1 text-[13px] text-ink-soft">{selected.pincode}</p>
            <p className="mt-3 text-[12px] text-ink-soft">
              {humanize(selected.status)} · {selected.partner}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-leaf">
              <Link href={`/orders/${selected.id}`} className="hover:underline">
                View order
              </Link>
              {selected.address || selected.pincode ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination(selected))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  Get directions ↗
                </a>
              ) : null}
            </div>
          </div>
          {!selected.address && !selected.pincode ? (
            <p className="text-[13px] text-ink-soft">
              No delivery location on file.
            </p>
          ) : mapsConfigured ? (
            <AddressMap key={selected.id} stop={selected} />
          ) : (
            <p className="text-[13px] text-ink-soft">
              Map preview unavailable. Use Get directions to view this address.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
