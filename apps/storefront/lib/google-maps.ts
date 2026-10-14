/** Browser key: restrict allowed websites and APIs in Google Cloud. */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
export const mapsConfigured = Boolean(KEY?.trim());

type MapsWindow = Window & {
  [callback: `__glowrootMapsReady${string}`]: (() => void) | undefined;
  __glowrootMapsLoader?: Promise<typeof google.maps>;
};

function readyMaps(): typeof google.maps | undefined {
  const maps = window.google?.maps;
  return typeof maps?.Map === "function" &&
    typeof maps.Geocoder === "function" &&
    typeof maps.Marker === "function"
    ? maps
    : undefined;
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Maps requires a browser"));
  if (!mapsConfigured)
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set"));
  const host = window as unknown as MapsWindow;
  if (host.__glowrootMapsLoader) return host.__glowrootMapsLoader;
  const existing = readyMaps();
  if (existing) return Promise.resolve(existing);

  host.__glowrootMapsLoader = new Promise((resolve, reject) => {
    const callback =
      `__glowrootMapsReady${Date.now()}${Math.random().toString(36).slice(2)}` as const;
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.onerror = null;
      // Google can respond after timeout; keep its callback callable but inert.
      host[callback] = () => {};
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      delete host.__glowrootMapsLoader;
      reject(new Error("Google Maps could not load. Please try again."));
    };
    const timeout = window.setTimeout(fail, 20000);
    host[callback] = () => {
      if (settled) return;
      const maps = readyMaps();
      // A blocked or incomplete API response may invoke the callback anyway.
      // Reject through the component's fallback instead of throwing globally.
      if (!maps) {
        fail();
        return;
      }
      settled = true;
      cleanup();
      resolve(maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams(
      {
        key: KEY!.trim(),
        loading: "async",
        callback,
        v: "weekly",
        region: "IN",
        language: "en",
        libraries: "geocoding",
      },
    )}`;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return host.__glowrootMapsLoader;
}
