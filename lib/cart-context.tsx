"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addLine,
  clearCart as clearCartState,
  EMPTY_CART,
  getCartSubtotal,
  getDeliveryFee,
  getTotalTyreQuantity,
  qualifiesForFreeDelivery,
  removeLine,
  updateLineQuantity,
  type Cart,
  type CartLine,
} from "./cart";

const STORAGE_KEY = "awt.cart.v1";

type AddPayload = Omit<CartLine, "quantity"> & { quantity: number };

type CartContextValue = {
  cart: Cart;
  hydrated: boolean;
  totalTyres: number;
  subtotal: number;
  /** Free-delivery qualification and fee assume delivery (not pickup) until checkout confirms the method. */
  qualifiesForFreeDelivery: boolean;
  deliveryFee: number;
  add: (line: AddPayload) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): Cart {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as Cart;
    if (!parsed || !Array.isArray(parsed.lines)) return EMPTY_CART;
    // Trust only well-formed lines.
    const lines = parsed.lines.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l.id === "string" &&
        typeof l.price === "number" &&
        typeof l.quantity === "number" &&
        l.quantity > 0,
    );
    return { lines };
  } catch {
    return EMPTY_CART;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount. Reading during render / in a lazy
    // initializer is unsafe on the server and causes hydration mismatches, so
    // the one-time sync from this external store belongs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      } catch {
        /* storage unavailable — cart still works for this session */
      }
    }, 120);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [cart, hydrated]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setCart(readStoredCart());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((line: AddPayload) => {
    setCart((current) => addLine(current, line));
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setCart((current) => updateLineQuantity(current, id, quantity));
  }, []);

  const remove = useCallback((id: string) => {
    setCart((current) => removeLine(current, id));
  }, []);

  const clear = useCallback(() => {
    setCart(clearCartState());
  }, []);

  const value = useMemo<CartContextValue>(() => {
    return {
      cart,
      hydrated,
      totalTyres: getTotalTyreQuantity(cart),
      subtotal: getCartSubtotal(cart),
      qualifiesForFreeDelivery: qualifiesForFreeDelivery(cart),
      deliveryFee: getDeliveryFee(cart),
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [cart, hydrated, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
