"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  matchesStore,
  storeAddress,
  type StoreLocation,
} from "../lib/store-locations";
import { StoreMap } from "./StoreMap";

export function StoreLocator({ shops }: { shops: StoreLocation[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const matches = useMemo(
    () => shops.filter((shop) => matchesStore(shop, query)),
    [shops, query],
  );
  const selected = matches.find((shop) => shop.id === selectedId) ?? matches[0];

  return (
    <div className="mt-8">
      <label htmlFor="store-search" className="block text-sm font-semibold">
        Search GlowRoot stores
      </label>
      <div className="mt-2 flex max-w-xl gap-2">
        <input
          id="store-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try GlowRoot, Bengaluru or 560001"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="px-3 text-sm font-semibold text-leaf"
          >
            Clear
          </button>
        )}
      </div>
      <p role="status" className="mt-3 text-sm text-ink-soft">
        {matches.length} {matches.length === 1 ? "store" : "stores"} found
      </p>
      {selected ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ul
            aria-label="GlowRoot stores"
            className="space-y-3 lg:max-h-[580px] lg:overflow-y-auto"
          >
            {matches.map((shop) => (
              <li key={shop.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(shop.id)}
                  aria-pressed={shop.id === selected.id}
                  className={`w-full rounded-2xl border p-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf ${shop.id === selected.id ? "border-leaf bg-leaf/10" : "border-line bg-paper hover:border-leaf/50"}`}
                >
                  <span className="flex items-center gap-3">
                    <Image
                      src="/assets/glowroot-store-marker.svg"
                      alt=""
                      width={44}
                      height={52}
                    />
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-leaf">
                        GlowRoot store
                      </span>
                      <span className="mt-1 block font-display text-xl font-semibold">
                        {shop.name}
                      </span>
                    </span>
                  </span>
                  <span className="mt-3 block text-sm text-ink-soft">
                    {shop.address}, {shop.city} · {shop.pincode}
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-leaf">
                    {shop.id === selected.id
                      ? "Selected on map"
                      : "View on map"}{" "}
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <section
            aria-label="Selected store"
            className="overflow-hidden rounded-2xl border border-line bg-paper"
          >
            <StoreMap shop={selected} />
            <div className="p-5 sm:p-6">
              <h2 className="text-2xl">{selected.name}</h2>
              <p className="mt-2 text-sm text-ink-soft">
                {storeAddress(selected)}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(storeAddress(selected))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-leaf px-5 py-3 text-sm font-semibold text-white"
                >
                  Get directions ↗
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
                  >
                    Call store
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-line bg-paper p-8">
          <h2 className="text-2xl">
            {shops.length ? "No matching stores" : "Stores coming soon"}
          </h2>
          <p className="mt-2 text-ink-soft">
            {shops.length
              ? "Try another city, store name or pincode."
              : "Our store locations will appear here as they become available."}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 font-semibold text-leaf underline"
            >
              Show all stores
            </button>
          )}
        </div>
      )}
    </div>
  );
}
