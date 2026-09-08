"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";

/** Fires once, client-side only — used to clear the cart after a verified payment. */
export function ClearCartOnMount() {
  const { clear } = useCart();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
