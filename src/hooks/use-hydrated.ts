"use client";

import { useEffect, useState } from "react";
import { useCartStore, usePreferenceStore } from "@/store/store";

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) {
        setHydrated(true);
      }
    };

    const cartPersist = useCartStore.persist;
    const prefPersist = usePreferenceStore.persist;
    const unsub = cartPersist?.onFinishHydration(finish) ?? (() => undefined);

    void Promise.all([
      cartPersist?.rehydrate() ?? Promise.resolve(),
      prefPersist?.rehydrate() ?? Promise.resolve(),
    ]).finally(finish);

    const fallback = window.setTimeout(finish, 250);

    return () => {
      cancelled = true;
      unsub();
      window.clearTimeout(fallback);
    };
  }, []);

  return hydrated;
}
