"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  BoxContent,
  Product,
  ServiceArea,
  ServiceConfig,
} from "@glowroot/types";
import { reconcileCart } from "@glowroot/data/seasonal";
import {
  findServiceArea,
  isServiceableWith,
  leadDaysFor,
} from "@glowroot/data/serviceability";

export type CartItem = {
  product: Product;
  qty: number;
  contents?: BoxContent[];
};

type StoreState = {
  // cart
  items: CartItem[];
  count: number;
  subtotalINR: number;
  addItem: (product: Product, qty?: number, contents?: BoxContent[]) => void;
  removeItem: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  // cart drawer visibility
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // "shake the floating cart bar" signal — increments on each ping
  cartPing: number;
  pingCart: () => void;
  // fly-to-cart animation trigger
  flyToCart: (imageUrl: string) => void;
  // pincode (non-blocking serviceability hint)
  pincode: string;
  setPincode: (value: string) => void;
  pincodeKnown: boolean;
  pincodeServiceable: boolean;
  /** The admin's record for this pincode, when it is a named area. */
  serviceArea: ServiceArea | null;
  /** Press-and-deliver lead time that applies to this pincode, in days. */
  leadDays: number;
  /** True once localStorage has been read — guards first-paint UI decisions. */
  hydrated: boolean;
};

const StoreContext = createContext<StoreState | null>(null);

const CART_KEY = "glowroot.cart";
const PIN_KEY = "glowroot.pincode";

/** A single in-flight "fly to cart" bubble. */
type FlyBubble = {
  id: number;
  imageUrl: string;
};

/**
 * `service` is the delivery map as the admin last saved it, handed down from
 * the server layout. Passing it in rather than importing a constant is what
 * makes the Locations screen a live control: pause an area there and the next
 * page load here stops offering it.
 */
export function StoreProvider({
  children,
  service,
  catalogue,
}: {
  children: ReactNode;
  service: ServiceConfig;
  catalogue: Product[];
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [pincode, setPincodeState] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [fly, setFly] = useState<FlyBubble | null>(null);
  const flyIdRef = useRef(0);
  const [cartPing, setCartPing] = useState(0);
  const pingCart = useCallback(() => setCartPing((n) => n + 1), []);

  // hydrate from localStorage on mount
  useEffect(() => {
    try {
      const rawCart = window.localStorage.getItem(CART_KEY);
      if (rawCart)
        setItems(reconcileCart(JSON.parse(rawCart) as CartItem[], catalogue));
      const rawPin = window.localStorage.getItem(PIN_KEY);
      if (rawPin) setPincodeState(rawPin);
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, [catalogue]);

  // persist
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PIN_KEY, pincode);
  }, [pincode, hydrated]);

  const addItem = useCallback(
    (product: Product, qty = 1, contents?: BoxContent[]) => {
      setItems((prev) => {
        // Build-your-own boxes carry a config-unique slug, so an identical fill
        // merges here while a differently-filled box stays a separate line.
        const existing = prev.find((i) => i.product.slug === product.slug);
        if (existing) {
          return prev.map((i) =>
            i.product.slug === product.slug
              ? { ...i, product, qty: i.qty + qty }
              : i,
          );
        }
        return [...prev, { product, qty, contents }];
      });
      setCartOpen(true);
    },
    [],
  );

  const removeItem = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.product.slug !== slug));
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.product.slug !== slug)
        : prev.map((i) => (i.product.slug === slug ? { ...i, qty } : i)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Spawn a juice bubble that bounces into the bottom-right cart island.
  // Exactly like the demo: fixed start point + a CSS arc that lands at the
  // corner — no per-button coordinate math.
  const flyToCart = useCallback((imageUrl: string) => {
    flyIdRef.current += 1;
    setFly({ id: flyIdRef.current, imageUrl });
    // Clear once the 750ms flight finishes so the next add can replay.
    window.setTimeout(() => {
      setFly((current) =>
        current && current.id === flyIdRef.current ? null : current,
      );
    }, 800);
  }, []);

  const setPincode = useCallback((value: string) => {
    setPincodeState(value.replace(/\D/g, "").slice(0, 6));
  }, []);

  const { count, subtotalINR } = useMemo(() => {
    return items.reduce(
      (acc, i) => ({
        count: acc.count + i.qty,
        subtotalINR: acc.subtotalINR + i.qty * i.product.priceINR,
      }),
      { count: 0, subtotalINR: 0 },
    );
  }, [items]);

  const pincodeKnown = pincode.length === 6;
  const pincodeServiceable = isServiceableWith(pincode, service);
  const serviceArea = pincodeKnown
    ? (findServiceArea(pincode, service) ?? null)
    : null;
  const leadDays = leadDaysFor(pincode, service);

  const value: StoreState = {
    items,
    count,
    subtotalINR,
    addItem,
    removeItem,
    setQty,
    clear,
    cartOpen,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    cartPing,
    pingCart,
    flyToCart,
    pincode,
    setPincode,
    pincodeKnown,
    pincodeServiceable,
    serviceArea,
    leadDays,
    hydrated,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
      {fly ? (
        <div key={fly.id} className="fly-bubble" aria-hidden="true">
          {/* Plain <img>: the source is a bare decorative clone, not a layout image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fly.imageUrl} alt="" />
        </div>
      ) : null}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
