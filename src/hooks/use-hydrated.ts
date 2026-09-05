"use client";

import { useEffect, useState } from "react";
import { useCartStore, usePreferenceStore } from "@/store/store";

export function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useCartStore.persist.hasHydrated());

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) {
        setHydrated(true);
      }
    };

    const unsub = useCartStore.persist.onFinishHydration(finish);
    void Promise.all([
      useCartStore.persist.rehydrate(),
      usePreferenceStore.persist.rehydrate(),
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
